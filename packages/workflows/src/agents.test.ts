import { ChangeSetSchema } from "@kiln/domain";
import { expect, test } from "vitest";
import { assertionProposerAgent } from "./agents/assertion-proposer.js";
import { entityResolverAgent } from "./agents/entity-resolver.js";
import { knowledgeReconcilerAgent } from "./agents/knowledge-reconciler.js";
import { ontologyMapperAgent } from "./agents/ontology-mapper.js";

const now = "2026-01-01T00:00:00.000Z";
const changeSet = {
  schemaVersion: 1,
  id: "changeset:agent-test",
  createdAt: now,
  updatedAt: now,
  entityChanges: [
    {
      op: "create",
      entityId: "concept:agent-harness",
      entity: {
        schemaVersion: 1,
        id: "concept:agent-harness",
        createdAt: now,
        updatedAt: now,
        type: "concept",
        label: "Agent Harness",
        aliases: ["agent-harness"],
        evidence: [],
        provenance: { createdBy: { type: "agent", workflow: "kb-propose", model: "mock" } },
      },
    },
  ],
  assertionChanges: [],
  ontologyChanges: [],
  ruleChanges: [],
  evidence: [],
  createdBy: { type: "agent", workflow: "kb-propose", model: "mock" },
  status: "proposed",
};

test("agent output schemas accept valid stage samples", () => {
  expect(
    entityResolverAgent.outputSchema.safeParse({
      resolutions: [
        {
          candidateId: "candidate:one",
          action: "create_new",
          label: "Agent Harness",
          aliases: ["agent-harness"],
          confidence: 0.8,
          reasoning: "New candidate.",
        },
      ],
    }).success,
  ).toBe(true);
  expect(
    ontologyMapperAgent.outputSchema.safeParse({
      mappings: [
        {
          candidateId: "candidate:one",
          entityType: "concept",
          confidence: 0.8,
          reasoning: "Fits.",
        },
      ],
    }).success,
  ).toBe(true);
  expect(
    assertionProposerAgent.outputSchema.safeParse({
      assertions: [
        {
          subjectText: "A",
          predicate: "relates_to",
          objectText: "B",
          confidence: 0.8,
          reasoning: "Supported.",
          evidenceRefs: ["evidence:one"],
        },
      ],
    }).success,
  ).toBe(true);
  expect(knowledgeReconcilerAgent.outputSchema.safeParse(changeSet).success).toBe(true);
});

test("entity creates require a label and ChangeSets require changes", () => {
  expect(
    entityResolverAgent.outputSchema.safeParse({
      resolutions: [
        {
          candidateId: "candidate:one",
          action: "map_to_existing",
          entityId: "concept:not-present",
          confidence: 0.8,
          reasoning: "Schema validation does not resolve references.",
        },
      ],
    }).success,
  ).toBe(true);
  expect(
    entityResolverAgent.outputSchema.safeParse({
      resolutions: [
        {
          candidateId: "candidate:one",
          action: "create_new",
          confidence: 0.8,
          reasoning: "Missing.",
        },
      ],
    }).success,
  ).toBe(false);
  expect(ChangeSetSchema.safeParse({ ...changeSet, entityChanges: [] }).success).toBe(false);
});
