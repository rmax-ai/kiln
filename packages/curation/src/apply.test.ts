import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Assertion, ChangeSet, Entity } from "@kiln/domain";
import { KnowledgeBase } from "@kiln/knowledge";
import { afterEach, expect, test } from "vitest";
import { applyChangeSet } from "./apply.js";

const now = "2026-01-01T00:00:00.000Z";
const entity: Entity = {
  schemaVersion: 1,
  id: "concept:one",
  createdAt: now,
  updatedAt: now,
  type: "concept",
  label: "One",
  aliases: ["one"],
  evidence: [],
  provenance: { createdBy: { type: "human" } },
};
const assertion: Assertion = {
  schemaVersion: 1,
  id: "assertion:one",
  createdAt: now,
  updatedAt: now,
  subject: { id: entity.id },
  predicate: "relates_to",
  object: { type: "string", value: "value" },
  evidence: [{ id: "evidence:one" }],
  status: "observed",
  provenance: { createdBy: { type: "human" } },
};
const make = (status: ChangeSet["status"] = "accepted"): ChangeSet => ({
  schemaVersion: 1,
  id: "changeset:one",
  createdAt: now,
  updatedAt: now,
  entityChanges: [{ op: "create", entityId: entity.id, entity }],
  assertionChanges: [{ op: "add", assertion }],
  ontologyChanges: [],
  ruleChanges: [],
  evidence: [],
  createdBy: { type: "human" },
  status,
});
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function base() {
  const dir = await mkdtemp(join(tmpdir(), "kiln-"));
  dirs.push(dir);
  return { dir, kb: new KnowledgeBase(dir) };
}
test("applies entities and assertions and persists the ChangeSet", async () => {
  const { dir, kb } = await base();
  const result = await applyChangeSet(kb, make());
  expect(result.ok).toBe(true);
  expect(await kb.entities.load(entity.id)).toEqual(entity);
  expect(await kb.assertions.load(assertion.id)).toEqual(assertion);
  expect(
    JSON.parse(await readFile(join(dir, "curation", "changesets", "changeset:one.json"), "utf8"))
      .status,
  ).toBe("applied");
});
test("refuses unaccepted changes without knowledge writes", async () => {
  const { dir, kb } = await base();
  const result = await applyChangeSet(kb, make("proposed"));
  expect(!result.ok && result.error.code).toBe("CONFLICT");
  await expect(readdir(join(dir, "knowledge"))).rejects.toMatchObject({ code: "ENOENT" });
});
test("validates before applying any changes", async () => {
  const { dir, kb } = await base();
  const change = make();
  change.entityChanges.push({
    op: "update",
    target: "concept:missing",
    entity: { ...entity, id: "concept:missing" },
  });
  const result = await applyChangeSet(kb, change);
  expect(!result.ok && result.error.code).toBe("VALIDATION_ERROR");
  await expect(readdir(join(dir, "knowledge"))).rejects.toMatchObject({ code: "ENOENT" });
});
test("is idempotent", async () => {
  const { dir, kb } = await base();
  await applyChangeSet(kb, make());
  const before = await readFile(join(dir, "curation", "changesets", "changeset:one.json"), "utf8");
  const result = await applyChangeSet(kb, make());
  const after = await readFile(join(dir, "curation", "changesets", "changeset:one.json"), "utf8");
  expect(result.ok && result.value.alreadyApplied).toBe(true);
  expect(after).toBe(before);
});
