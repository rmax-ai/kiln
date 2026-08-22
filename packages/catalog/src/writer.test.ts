import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CatalogExtraction } from "./extractor.js";
import { writeCatalog } from "./writer.js";

const directories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "kiln-catalog-"));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

const extraction: CatalogExtraction = {
  observations: [
    { id: "obs:youtube:TEST01:0", sourceId: "source:youtube:TEST01", kind: "topic", text: "Topic" },
  ],
  mentions: [
    {
      id: "men:youtube:TEST01:0",
      sourceId: "source:youtube:TEST01",
      text: "Quote",
      context: "Claim",
      section: "Topic",
    },
  ],
  entityCandidates: [
    {
      id: "ent:youtube:TEST01:0",
      sourceId: "source:youtube:TEST01",
      name: "Entity",
      normalizedName: "entity",
      context: "Claim",
    },
  ],
  assertionCandidates: [
    {
      id: "ass:youtube:TEST01:0",
      sourceId: "source:youtube:TEST01",
      subjectText: "Claim",
      objectText: "Topic",
      evidence: [],
    },
  ],
  relationshipCandidates: [
    {
      id: "rel:youtube:TEST01:0",
      sourceId: "source:youtube:TEST01",
      subjectText: "Entity",
      predicateHint: "relates_to",
      objectText: "Other",
      context: "Claim",
    },
  ],
};

describe("writeCatalog", () => {
  it("writes five parseable JSONL files", async () => {
    const files = await writeCatalog(await temporaryDirectory(), extraction);
    const contents = await Promise.all(Object.values(files).map((file) => readFile(file, "utf8")));

    expect(
      contents.map((content) =>
        content
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line)),
      ),
    ).toEqual([
      extraction.observations,
      extraction.mentions,
      extraction.entityCandidates,
      extraction.assertionCandidates,
      extraction.relationshipCandidates,
    ]);
  });

  it("produces byte-identical output in separate directories", async () => {
    const first = await writeCatalog(await temporaryDirectory(), extraction);
    const second = await writeCatalog(await temporaryDirectory(), extraction);

    for (const key of Object.keys(first) as (keyof typeof first)[]) {
      expect(await readFile(second[key], "utf8")).toBe(await readFile(first[key], "utf8"));
    }
  });
});
