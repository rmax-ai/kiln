import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChangeSet, Entity } from "@kiln/domain";
import { KnowledgeBase } from "@kiln/knowledge";
import { afterEach, expect, test } from "vitest";
import { validateChangeSet } from "./validate.js";

const now = "2026-01-01T00:00:00.000Z";
const entity = (id = "concept:one"): Entity => ({
  schemaVersion: 1,
  id,
  createdAt: now,
  updatedAt: now,
  type: "concept",
  label: "One",
  aliases: ["one"],
  description: "One",
  evidence: [],
  provenance: { createdBy: { type: "human" } },
});
const changeSet = (changes: ChangeSet["entityChanges"]): ChangeSet => ({
  schemaVersion: 1,
  id: "changeset:one",
  createdAt: now,
  updatedAt: now,
  entityChanges: changes,
  assertionChanges: [],
  ontologyChanges: [],
  ruleChanges: [],
  evidence: [],
  createdBy: { type: "human" },
  status: "accepted",
});
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function kb(): Promise<KnowledgeBase> {
  const dir = await mkdtemp(join(tmpdir(), "kiln-"));
  dirs.push(dir);
  return new KnowledgeBase(dir);
}

test("rejects schema-invalid changesets", async () => {
  const result = await validateChangeSet(await kb(), {
    ...changeSet([]),
    entityChanges: [],
  } as ChangeSet);
  expect(result.ok).toBe(false);
});
test("reports missing entity updates", async () => {
  const result = await validateChangeSet(
    await kb(),
    changeSet([{ op: "update", target: "concept:missing", entity: entity("concept:missing") }]),
  );
  expect(result.errors.join(" ")).toContain("concept:missing");
});
test("reports duplicate targets", async () => {
  const result = await validateChangeSet(
    await kb(),
    changeSet([
      { op: "create", entityId: "concept:one", entity: entity() },
      { op: "update", target: "concept:one", entity: entity() },
    ]),
  );
  expect(result.errors).toContain("duplicate target: concept:one");
});
test("accepts a standalone create", async () => {
  expect(
    (
      await validateChangeSet(
        await kb(),
        changeSet([{ op: "create", entityId: "concept:one", entity: entity() }]),
      )
    ).ok,
  ).toBe(true);
});
test("rejects creates for existing entities", async () => {
  const base = await kb();
  await base.entities.save(entity());
  const result = await validateChangeSet(
    base,
    changeSet([{ op: "create", entityId: "concept:one", entity: entity() }]),
  );
  expect(result.errors.join(" ")).toContain("concept:one");
});
