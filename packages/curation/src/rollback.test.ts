import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChangeSet, Entity } from "@kiln/domain";
import { KnowledgeBase } from "@kiln/knowledge";
import { afterEach, expect, test } from "vitest";
import { applyChangeSet } from "./apply.js";
import { rollbackChangeSet } from "./rollback.js";

const now = "2026-01-01T00:00:00.000Z";
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
test("rolls back creates and records a decision", async () => {
  const dir = await mkdtemp(join(tmpdir(), "kiln-"));
  dirs.push(dir);
  const kb = new KnowledgeBase(dir);
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
  const change: ChangeSet = {
    schemaVersion: 1,
    id: "changeset:one",
    createdAt: now,
    updatedAt: now,
    entityChanges: [{ op: "create", entityId: entity.id, entity }],
    assertionChanges: [],
    ontologyChanges: [],
    ruleChanges: [],
    evidence: [],
    createdBy: { type: "human" },
    status: "accepted",
  };
  await applyChangeSet(kb, change);
  expect((await rollbackChangeSet(kb, change.id)).ok).toBe(true);
  expect(await kb.entities.exists(entity.id)).toBe(false);
  expect((await kb.decisions.list()).some((decision) => decision.operation === "ROLLBACK")).toBe(
    true,
  );
});
