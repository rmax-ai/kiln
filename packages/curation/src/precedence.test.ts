import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ChallengeProposalSchema, type ChangeSet, type Entity, type Rule } from "@kiln/domain";
import { KnowledgeBase } from "@kiln/knowledge";
import { afterEach, expect, test } from "vitest";
import { challengeForConflict, checkPrecedence } from "./precedence.js";

const now = "2026-01-01T00:00:00.000Z";
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
test("flags NEVER_MERGE and produces a valid challenge", async () => {
  const dir = await mkdtemp(join(tmpdir(), "kiln-"));
  dirs.push(dir);
  const kb = new KnowledgeBase(dir);
  const rule: Rule = {
    schemaVersion: 1,
    id: "rule:never-merge",
    createdAt: now,
    updatedAt: now,
    type: "NEVER_MERGE",
    scope: { scopeType: "entity", entityId: "concept:one" },
    rationale: "Keep distinct",
    status: "active",
  };
  await kb.rules.save(rule);
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
    entityChanges: [{ op: "merge", target: "concept:one", entityId: "concept:two", entity }],
    assertionChanges: [],
    ontologyChanges: [],
    ruleChanges: [],
    evidence: [],
    createdBy: { type: "human" },
    status: "proposed",
  };
  const [conflict] = await checkPrecedence(kb, change);
  expect(conflict).toBeDefined();
  const challenge = challengeForConflict(conflict!, { type: "human" });
  expect(ChallengeProposalSchema.safeParse(challenge).success).toBe(true);
  expect(challenge.target).toBe(rule.id);
});
