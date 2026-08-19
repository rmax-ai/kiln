import { KilnError, type SourceDocument } from "@kiln/domain";

export interface SourceAdapter {
  readonly id: string;
  readonly formatVersion: string;
  listFiles(inputPath: string): Promise<string[]>;
  parseFile(path: string): Promise<SourceDocument>;
}

export interface Clock {
  nowIso(): string;
}
export class SystemClock implements Clock {
  nowIso(): string {
    return new Date().toISOString();
  }
}

function parseScalar(value: string, path?: string): string | number {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.length === 0)
    throw new KilnError("SCHEMA_ERROR", `Empty scalar${path ? ` in ${path}` : ""}`);
  return trimmed;
}

/** Minimal YAML reader for the flat frontmatter format used by source fixtures. */
export function parseYamlFrontmatter(yaml: string, path?: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.replace(/\r\n/g, "\n").split("\n");
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    index += 1;
    if (line.trim() === "") continue;
    const match = /^([A-Za-z_][A-Za-z0-9_-]*):(?:\s*(.*))?$/.exec(line);
    if (!match)
      throw new KilnError(
        "SCHEMA_ERROR",
        `Unparseable frontmatter${path ? ` in ${path}` : ""}: ${line}`,
      );
    const key = match[1]!;
    const value = match[2] ?? "";
    if (value.trim().startsWith("[")) {
      if (!value.trim().endsWith("]"))
        throw new KilnError("SCHEMA_ERROR", `Unparseable flow array${path ? ` in ${path}` : ""}`);
      const contents = value.trim().slice(1, -1).trim();
      result[key] =
        contents === "" ? [] : contents.split(",").map((item) => parseScalar(item, path));
      continue;
    }
    if (value.trim() !== "") {
      result[key] = parseScalar(value, path);
      continue;
    }
    const array: unknown[] = [];
    const multiline: string[] = [];
    while (index < lines.length && !/^[A-Za-z_][A-Za-z0-9_-]*:/.test(lines[index] ?? "")) {
      const child = lines[index] ?? "";
      index += 1;
      if (child.trim() === "") continue;
      const item = /^\s*-\s+(.+)$/.exec(child);
      if (item) array.push(parseScalar(item[1]!, path));
      else if (/^\s+/.test(child)) multiline.push(child.trim());
      else
        throw new KilnError(
          "SCHEMA_ERROR",
          `Unparseable frontmatter${path ? ` in ${path}` : ""}: ${child}`,
        );
    }
    if (array.length > 0 && multiline.length > 0)
      throw new KilnError("SCHEMA_ERROR", `Mixed array and scalar${path ? ` in ${path}` : ""}`);
    result[key] = array.length > 0 ? array : multiline.join("\n");
  }
  return result;
}

export function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(normalized);
  if (!match) throw new KilnError("SCHEMA_ERROR", "Missing YAML frontmatter");
  return { frontmatter: parseYamlFrontmatter(match[1]!), body: match[2]! };
}
