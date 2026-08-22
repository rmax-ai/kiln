import type { SourceDocument } from "@kiln/domain";
import { describe, expect, it } from "vitest";
import { extractCatalog } from "./extractor.js";

function document(content: string, tags = ["Context Engineering"]): SourceDocument {
  return {
    schemaVersion: 1,
    id: "source:youtube:TEST01",
    type: "video",
    metadata: {
      title: "Catalog Test Video",
      authors: ["Ada Lovelace"],
      tags,
    },
    content,
    provenance: { producer: "test", capturedAt: "2026-01-01T00:00:00Z" },
    createdAt: "2026-01-01T00:00:00Z",
  };
}

describe("extractCatalog", () => {
  const content = `## Foundations
### Context Engineering Meets Agent Runtime
type: architecture · evidence: strong · novelty: medium
**Why it matters**: It makes runtime context explicit.
**Evidence**:
- "First quoted source."
- "Second quoted source."

## Operations
### Runtime Design Improves Reliability
type: practice · evidence: medium · novelty: low
**Generalization**: Measure reliability.
`;

  it("extracts observations, mentions, and assertion candidates in document order", () => {
    const extraction = extractCatalog(document(content));

    expect(extraction.observations).toHaveLength(4);
    expect(extraction.observations).toEqual([
      {
        id: "obs:youtube:TEST01:0",
        sourceId: "source:youtube:TEST01",
        kind: "topic",
        text: "Foundations",
      },
      {
        id: "obs:youtube:TEST01:1",
        sourceId: "source:youtube:TEST01",
        kind: "claim",
        text: "Context Engineering Meets Agent Runtime",
        section: "Foundations",
        confidence: 0.9,
      },
      {
        id: "obs:youtube:TEST01:2",
        sourceId: "source:youtube:TEST01",
        kind: "topic",
        text: "Operations",
      },
      {
        id: "obs:youtube:TEST01:3",
        sourceId: "source:youtube:TEST01",
        kind: "claim",
        text: "Runtime Design Improves Reliability",
        section: "Operations",
        confidence: 0.6,
      },
    ]);
    expect(
      extraction.mentions.map(({ text, context, section }) => ({ text, context, section })),
    ).toEqual([
      {
        text: "First quoted source.",
        context: "Context Engineering Meets Agent Runtime",
        section: "Foundations",
      },
      {
        text: "Second quoted source.",
        context: "Context Engineering Meets Agent Runtime",
        section: "Foundations",
      },
    ]);
    expect(extraction.assertionCandidates).toEqual([
      {
        id: "ass:youtube:TEST01:0",
        sourceId: "source:youtube:TEST01",
        subjectText: "Context Engineering Meets Agent Runtime",
        objectText: "Foundations",
        evidence: [],
      },
      {
        id: "ass:youtube:TEST01:1",
        sourceId: "source:youtube:TEST01",
        subjectText: "Runtime Design Improves Reliability",
        objectText: "Operations",
        evidence: [],
      },
    ]);
  });

  it("deduplicates entities and assigns sorted deterministic IDs", () => {
    const extraction = extractCatalog(document(content));
    const names = extraction.entityCandidates.map((candidate) => candidate.normalizedName);

    expect(names).toEqual([...names].sort());
    expect(
      extraction.entityCandidates.filter(
        (candidate) => candidate.normalizedName === "context-engineering",
      ),
    ).toHaveLength(1);
    expect(extraction.entityCandidates).toContainEqual(
      expect.objectContaining({
        id: "ent:youtube:TEST01:0",
        normalizedName: "ada-lovelace",
      }),
    );
    expect(extraction.entityCandidates.map((candidate) => candidate.id)).toEqual(
      extraction.entityCandidates.map((_, index) => `ent:youtube:TEST01:${index}`),
    );
  });

  it("creates relationships only for entities co-occurring in a heading", () => {
    const extraction = extractCatalog(
      document(
        `## Foundations
### Context Engineering and Agent Runtime
type: architecture · evidence: strong
`,
        ["Context Engineering", "Agent Runtime", "Never Mentioned"],
      ),
    );

    expect(extraction.relationshipCandidates).toEqual([
      {
        id: "rel:youtube:TEST01:0",
        sourceId: "source:youtube:TEST01",
        subjectText: "Agent Runtime",
        predicateHint: "relates_to",
        objectText: "Context Engineering",
        context: "Context Engineering and Agent Runtime",
      },
    ]);
  });

  it("is deterministic and tolerates missing optional blocks", () => {
    const source = document("## Minimal\n### Plain Claim\n");
    const first = extractCatalog(source);
    const second = extractCatalog(source);

    expect(second).toEqual(first);
    expect(first.observations[1]).not.toHaveProperty("confidence");
    expect(first.mentions).toEqual([]);
  });

  it("keeps IDs unique across documents sharing a source id when seeded", () => {
    const first = extractCatalog(document("## One\n### First Claim\n"));
    const second = extractCatalog(document("## Two\n### Second Claim\n"), {
      observations: first.observations.length,
      mentions: first.mentions.length,
      entityCandidates: first.entityCandidates.length,
      assertionCandidates: first.assertionCandidates.length,
      relationshipCandidates: first.relationshipCandidates.length,
    });
    const allIds = [
      ...first.observations,
      ...second.observations,
      ...first.mentions,
      ...second.mentions,
      ...first.entityCandidates,
      ...second.entityCandidates,
      ...first.assertionCandidates,
      ...second.assertionCandidates,
      ...first.relationshipCandidates,
      ...second.relationshipCandidates,
    ].map((record) => record.id);

    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
