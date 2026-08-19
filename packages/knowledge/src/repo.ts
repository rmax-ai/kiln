import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { type DurableBase, err, KilnError, ok, type Result } from "@kiln/domain";
import type { ZodType } from "zod";

export type DurableRecord = DurableBase;
export interface RepoWarning {
  path: string;
  message: string;
}
const directoryByKind: Record<string, string> = {
  concept: "concepts",
  problem: "problems",
  pattern: "patterns",
  technique: "techniques",
  system: "systems",
  tool: "tools",
  claim: "claims",
  person: "people",
  organization: "organizations",
  video: "videos",
  paper: "papers",
  article: "articles",
  repository: "repositories",
  documentation: "documentation",
  podcast: "podcasts",
  note: "notes",
  assertion: "assertions",
  evidence: "evidence",
  resource: "resources",
  decision: "decisions",
  rule: "rules",
  proposal: "proposals",
  changeset: "changesets",
  enrichment: "enrichment",
};

export class RecordRepo<T extends DurableRecord> {
  readonly warnings: RepoWarning[] = [];
  private readonly schema?: ZodType<T>;
  private readonly customDirFor?: (id: string, record?: T) => string;
  private readonly listDir?: string;
  constructor(
    private readonly baseDir: string,
    opts: {
      schema?: ZodType<T>;
      dirFor?: (id: string, record?: T) => string;
      listDir?: string;
    } = {},
  ) {
    this.schema = opts.schema;
    this.customDirFor = opts.dirFor;
    this.listDir = opts.listDir;
  }
  dirFor(id: string, record?: T): string {
    if (this.customDirFor) return this.customDirFor(id, record);
    const kind = id.split(":", 1)[0];
    const directory = directoryByKind[kind ?? ""];
    if (!directory || !/^[a-z]+:[^/]+$/.test(id))
      throw new KilnError("INVALID_ID", `Invalid record ID: ${id}`);
    return directory;
  }
  private pathFor(id: string, record?: T): string {
    return join(this.baseDir, this.dirFor(id, record), `${id}.json`);
  }
  private validate(record: unknown): T {
    if (!this.schema) return record as T;
    const result = this.schema.safeParse(record);
    if (!result.success) throw new KilnError("SCHEMA_ERROR", result.error.message);
    return result.data;
  }
  async load(id: string): Promise<T | null> {
    let path = this.pathFor(id);
    if (this.customDirFor) {
      const found = (await this.files(join(this.baseDir, this.listDir ?? ""))).find((file) =>
        file.endsWith(`/${id}.json`),
      );
      if (found) path = found;
    }
    try {
      return this.validate(JSON.parse(await readFile(path, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      if (error instanceof KilnError) throw error;
      throw new KilnError("SCHEMA_ERROR", `Unable to read ${path}: ${(error as Error).message}`);
    }
  }
  async save(record: T): Promise<void> {
    const validated = this.validate(record);
    const path = this.pathFor(validated.id, validated);
    const temporary = join(dirname(path), `.${validated.id}.json.tmp`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
    await rename(temporary, path);
  }
  private async files(dir: string): Promise<string[]> {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    return (
      await Promise.all(
        entries
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(async (entry) =>
            entry.isDirectory()
              ? this.files(join(dir, entry.name))
              : entry.name.endsWith(".json")
                ? [join(dir, entry.name)]
                : [],
          ),
      )
    ).flat();
  }
  async list(): Promise<T[]> {
    this.warnings.length = 0;
    const records: T[] = [];
    for (const path of await this.files(join(this.baseDir, this.listDir ?? ""))) {
      try {
        records.push(this.validate(JSON.parse(await readFile(path, "utf8"))));
      } catch (error) {
        if (error instanceof KilnError || error instanceof SyntaxError)
          this.warnings.push({ path, message: error.message });
        else throw error;
      }
    }
    return records;
  }
  async exists(id: string): Promise<boolean> {
    return (await this.load(id)) !== null;
  }
  async delete(id: string): Promise<Result<void>> {
    let path = this.pathFor(id);
    if (this.customDirFor) {
      const found = (await this.files(join(this.baseDir, this.listDir ?? ""))).find((file) =>
        file.endsWith(`/${id}.json`),
      );
      if (found) path = found;
    }
    try {
      await rm(path);
      return ok(undefined);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return err("NOT_FOUND", `Record not found: ${id}`);
      if (error instanceof KilnError) return { ok: false, error };
      return err("CONFLICT", `Unable to delete ${id}: ${(error as Error).message}`);
    }
  }
}
