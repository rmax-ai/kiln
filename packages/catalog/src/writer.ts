import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CatalogExtraction } from "./extractor.js";

export interface CatalogFiles {
  observations: string;
  mentions: string;
  entityCandidates: string;
  assertionCandidates: string;
  relationshipCandidates: string;
}

function toJsonl(records: unknown[]): string {
  return records.map((record) => `${JSON.stringify(record)}\n`).join("");
}

export async function writeCatalog(
  outputDir: string,
  extraction: CatalogExtraction,
): Promise<CatalogFiles> {
  const directory = resolve(outputDir);
  await mkdir(directory, { recursive: true });
  const files: CatalogFiles = {
    observations: resolve(directory, "observations.jsonl"),
    mentions: resolve(directory, "mentions.jsonl"),
    entityCandidates: resolve(directory, "entity-candidates.jsonl"),
    assertionCandidates: resolve(directory, "assertion-candidates.jsonl"),
    relationshipCandidates: resolve(directory, "relationship-candidates.jsonl"),
  };
  await Promise.all([
    writeFile(files.observations, toJsonl(extraction.observations)),
    writeFile(files.mentions, toJsonl(extraction.mentions)),
    writeFile(files.entityCandidates, toJsonl(extraction.entityCandidates)),
    writeFile(files.assertionCandidates, toJsonl(extraction.assertionCandidates)),
    writeFile(files.relationshipCandidates, toJsonl(extraction.relationshipCandidates)),
  ]);
  return files;
}
