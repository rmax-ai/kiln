import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { type ChangeSet, err, makeUlid, type Result } from "@kiln/domain";
import type { KnowledgeBase } from "@kiln/knowledge";

interface JournalEntry {
  op: string;
  store: "entity" | "assertion" | "rule";
  id: string;
  existed: boolean;
  previous: unknown | null;
}

async function writeArtifact(path: string, value: unknown): Promise<void> {
  const temporary = join(dirname(path), `.${path.split("/").at(-1) ?? "record"}.tmp`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function rollbackChangeSet(
  kb: KnowledgeBase,
  changeSetId: string,
): Promise<Result<{ rolledBack: boolean }>> {
  const base = join(kb.curationRoot, "changesets", changeSetId);
  let journal: { changesetId: string; entries: JournalEntry[] };
  let changeSet: ChangeSet;
  try {
    journal = JSON.parse(await readFile(`${base}.journal.json`, "utf8"));
    changeSet = JSON.parse(await readFile(`${base}.json`, "utf8")) as ChangeSet;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return err("NOT_FOUND", `ChangeSet journal not found: ${changeSetId}`);
    return err("CONFLICT", `Unable to read ChangeSet ${changeSetId}: ${(error as Error).message}`);
  }
  try {
    for (const entry of [...journal.entries].reverse()) {
      const repo =
        entry.store === "entity"
          ? kb.entities
          : entry.store === "assertion"
            ? kb.assertions
            : kb.rules;
      if (entry.existed && entry.previous) await repo.save(entry.previous as never);
      else {
        const deleted = await repo.delete(entry.id);
        if (!deleted.ok && deleted.error.code !== "NOT_FOUND")
          return { ok: false, error: deleted.error };
      }
    }
    await writeArtifact(`${base}.json`, { ...changeSet, status: "rolled_back" });
    const now = new Date().toISOString();
    await kb.decisions.save({
      schemaVersion: 1,
      id: makeUlid(),
      createdAt: now,
      updatedAt: now,
      target: changeSetId,
      operation: "ROLLBACK",
      actor: changeSet.createdBy,
      reason: `Rollback of ChangeSet ${changeSetId}`,
      evidence: [],
      status: "accepted",
    });
    return { ok: true, value: { rolledBack: true } };
  } catch (error) {
    return err(
      "CONFLICT",
      `Unable to roll back ChangeSet ${changeSetId}: ${(error as Error).message}`,
    );
  }
}
