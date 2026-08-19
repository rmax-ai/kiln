import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Entity, EntitySchema } from "@kiln/domain";
import { RecordRepo } from "@kiln/knowledge";
import { describe, expect, it } from "vitest";

const entity: Entity = {
  schemaVersion: 1,
  id: "concept:testing",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  type: "concept",
  label: "Testing",
  aliases: ["testing"],
  evidence: [],
  provenance: { createdBy: { type: "human" } },
};
describe("RecordRepo", () => {
  it("round-trips atomically and derives plural directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "kiln-repo-"));
    const repo = new RecordRepo(root, { schema: EntitySchema });
    await repo.save(entity);
    expect(await repo.load(entity.id)).toEqual(entity);
    expect(await readdir(join(root, "concepts"))).toEqual(["concept:testing.json"]);
    expect(await repo.delete(entity.id)).toMatchObject({ ok: true });
    expect(await repo.load(entity.id)).toBeNull();
  });
  it("skips malformed JSON with a warning", async () => {
    const root = await mkdtemp(join(tmpdir(), "kiln-repo-"));
    const repo = new RecordRepo(root, { schema: EntitySchema });
    await repo.save(entity);
    await writeFile(join(root, "concepts", "concept:bad.json"), "{");
    expect(await repo.list()).toEqual([entity]);
    expect(repo.warnings).toHaveLength(1);
  });
});
