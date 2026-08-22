import type { ChangeSet, Entity } from "@kiln/domain";
import { expect, test } from "vitest";
import { policyForChangeSet } from "./policy.js";

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
const base = (): ChangeSet => ({
  schemaVersion: 1,
  id: "changeset:one",
  createdAt: now,
  updatedAt: now,
  entityChanges: [],
  assertionChanges: [],
  ontologyChanges: [],
  ruleChanges: [],
  evidence: [],
  createdBy: { type: "human" },
  status: "proposed",
});
test("merge requires review", () => {
  const c = base();
  c.entityChanges = [{ op: "merge", target: "concept:one", entityId: "concept:two", entity }];
  expect(policyForChangeSet(c).verdict).toBe("require_review");
});
test("entity create auto-accepts", () => {
  const c = base();
  c.entityChanges = [{ op: "create", entityId: entity.id, entity }];
  expect(policyForChangeSet(c).verdict).toBe("auto_accept");
});
test("mixed policy lists every action", () => {
  const c = base();
  c.entityChanges = [
    { op: "merge", target: "concept:one", entityId: "concept:two", entity },
    { op: "create", entityId: entity.id, entity },
  ];
  const result = policyForChangeSet(c);
  expect(result.actions).toEqual(["entity_merge", "new_source_indexing"]);
  expect(result.verdict).toBe("require_review");
});
