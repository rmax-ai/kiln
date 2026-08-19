import { describe, expect, it } from "vitest";
import { AssertionSchema } from "./assertion.js";
import { ChangeSetSchema } from "./changeset.js";
import { DecisionSchema } from "./decision.js";
import { EntitySchema } from "./entity.js";
import { ChallengeProposalSchema } from "./proposal.js";
import { RuleScopeSchema } from "./rule.js";

const at = "2026-01-02T03:04:05Z";
const actor = { type: "human" as const, name: "Reviewer" };
const provenance = { createdBy: actor };
const base = { schemaVersion: 1, createdAt: at, updatedAt: at };

describe("durable schema validation", () => {
  it("accepts a valid entity and rejects invalid aliases and extra fields", () => {
    const entity = {
      ...base,
      id: "concept:context-engineering",
      type: "concept",
      label: "Context Engineering",
      aliases: ["context-engineering"],
      evidence: [{ id: "evidence:source-1-aabbccdd" }],
      provenance,
    };
    expect(EntitySchema.safeParse(entity).success).toBe(true);
    expect(EntitySchema.safeParse({ ...entity, aliases: ["Context Engineering"] }).success).toBe(
      false,
    );
    expect(EntitySchema.safeParse({ ...entity, unexpected: true }).success).toBe(false);
  });

  it("requires assertion evidence and bounded confidence", () => {
    const assertion = {
      ...base,
      id: "assertion:a-uses-b",
      subject: { id: "concept:a" },
      predicate: "uses" as const,
      object: { id: "tool:b" },
      evidence: [{ id: "evidence:x" }],
      status: "observed" as const,
      provenance,
    };
    expect(AssertionSchema.safeParse({ ...assertion, evidence: [] }).success).toBe(false);
    expect(AssertionSchema.safeParse({ ...assertion, confidence: 1.5 }).success).toBe(false);
  });

  it("validates decision operations and ULID IDs", () => {
    const decision = {
      ...base,
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      target: "concept:a",
      operation: "SET_FIELD" as const,
      actor,
      reason: "Correct label",
      evidence: [],
      status: "accepted" as const,
    };
    expect(DecisionSchema.safeParse(decision).success).toBe(true);
    expect(DecisionSchema.safeParse({ ...decision, operation: "INVALID" }).success).toBe(false);
    expect(DecisionSchema.safeParse({ ...decision, id: "decision:wrong" }).success).toBe(false);
  });

  it("validates every rule scope", () => {
    expect(RuleScopeSchema.safeParse({ scopeType: "entity", entityId: "concept:a" }).success).toBe(
      true,
    );
    expect(RuleScopeSchema.safeParse({ scopeType: "predicate", predicate: "uses" }).success).toBe(
      true,
    );
    expect(
      RuleScopeSchema.safeParse({ scopeType: "entity_type", entityType: "concept" }).success,
    ).toBe(true);
    expect(
      RuleScopeSchema.safeParse({ scopeType: "source_type", sourceType: "video" }).success,
    ).toBe(true);
    expect(RuleScopeSchema.safeParse({ scopeType: "domain", domain: "software" }).success).toBe(
      true,
    );
    expect(RuleScopeSchema.safeParse({ scopeType: "invalid" }).success).toBe(false);
  });

  it("requires a ChangeSet change and a challenge target", () => {
    const changeset = {
      ...base,
      id: "changeset:01ARZ3NDEKTSV4RRFFQ69G5FAV",
      entityChanges: [],
      assertionChanges: [],
      ontologyChanges: [],
      ruleChanges: [],
      evidence: [],
      createdBy: actor,
      status: "proposed" as const,
    };
    expect(ChangeSetSchema.safeParse(changeset).success).toBe(false);
    const challenge = {
      ...base,
      id: "proposal:01ARZ3NDEKTSV4RRFFQ69G5FAV",
      kind: "curation_rule_change" as const,
      title: "Challenge",
      change: {},
      reason: "New evidence",
      supportingEvidence: [],
      contradictingEvidence: [],
      affectedRecords: [],
      impactAnalysis: "Review",
      generatedBy: actor,
    };
    expect(ChallengeProposalSchema.safeParse(challenge).success).toBe(false);
  });
});
