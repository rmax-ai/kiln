# Domain Model

> References SPEC.md §5–§19. All schemas live in `packages/domain/src/schemas/` with explicit `schemaVersion` fields.

## Core records

Every durable record carries: `schemaVersion`, `id`, `createdAt`, `updatedAt`.

| Record | Kind prefix | Stability | File location |
|---|---|---|---|
| SourceDocument | `source:` | immutable after ingest | `sources/**` (Markdown) |
| Entity | type-specific (`concept:`, `person:`, …) | durable, curated | `knowledge/entities/<type>/<id>.json` |
| Assertion | `assertion:` | durable, curated | `knowledge/assertions/<id>.json` |
| Evidence | `evidence:` | durable | `knowledge/evidence/<id>.json` |
| Resource | `resource:` | durable | `knowledge/resources/<id>.json` |
| Decision | `decision:` (ULID) | immutable once accepted | `curation/decisions/<YYYY>/<id>.json` |
| Rule | `rule:` | durable, mutable via decisions | `curation/rules/<scope>/<id>.json` |
| Proposal | `proposal:` (ULID) | temporary | `curation/proposals/{pending,accepted,rejected,challenged}/<id>.json` |
| ChangeSet | `changeset:` (ULID) | temporary until applied | `curation/proposals/**` |
| EnrichmentRequest | `enrichment:` (ULID) | temporary | `curation/proposals/**` |

Catalog records (Observations, Mentions, CandidateEntities, CandidateAssertions, CandidateRelationships) are **not durable records** — they live in `catalog/*.jsonl` and are regenerable from sources.

## Source (SPEC §6)

```ts
interface SourceDocument {
  id: SourceId;                    // source:youtube:MkRYPFIMCSA
  type: SourceType;                // video | paper | article | repository | documentation | podcast | note
  metadata: SourceMetadata;        // title, authors/speakers, publishedAt, uri, channel, tags…
  content?: string;                // raw content or structured sections
  provenance: SourceProvenance;    // upstream producer, generatedBy, capturedAt
}
```

Adapters convert external Markdown → SourceDocument. Adapters make **no** canonical knowledge decisions.

## Entity (SPEC §8)

```ts
interface Entity {
  id: EntityId;
  type: EntityType;                // initial taxonomy: video, paper, article, repository,
                                   // documentation, person, organization,
                                   // concept, problem, pattern, technique, system, tool, claim
  label: string;                   // canonical label
  aliases: string[];               // normalized (lowercase, kebab) at write time
  description?: string;
  ontologyType?: string;           // reference into ontology definitions
  evidence: EvidenceRef[];         // what supports this entity's existence/identity
  provenance: KnowledgeProvenance;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}
```

Same-name-different-concept is handled by: canonical ID + label collision review (never auto-merge on name alone).

## Assertion (SPEC §9)

```ts
interface Assertion {
  id: AssertionId;
  subject: EntityRef;
  predicate: Predicate;            // registered in ontology predicate registry
  object: EntityRef | LiteralValue;
  evidence: EvidenceRef[];
  status: "observed" | "corroborated" | "contested" | "superseded" | "rejected";
  confidence?: number;             // 0..1
  temporal?: { validFrom?: string; validTo?: string };
  provenance: KnowledgeProvenance;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}
```

Predicates start from a minimal registry (`addresses`, `uses`, `implements`, `extends`, `introduces`, `relates_to`, `contradicts`, `challenges`) and grow only via ontology-change decisions.

## Evidence (SPEC §10)

```ts
interface Evidence {
  id: EvidenceId;
  source: SourceRef;
  relation: "supports" | "refutes" | "contextualizes";
  locator?: { timestampSeconds?: number; section?: string; urlFragment?: string };
  excerpt?: string;                // concise — no bulk copying
  provenance: KnowledgeProvenance & { retrievedAt?: string };
}
```

## Curation records (SPEC §11)

- **Decision** — accepted semantic change: `operation` ∈ {SET_FIELD, ADD_ALIAS, REMOVE_ALIAS, MERGE_ENTITY, SPLIT_ENTITY, RECLASSIFY_ENTITY, ADD_ASSERTION, REMOVE_ASSERTION, SUPERSEDE_ASSERTION, ACCEPT_RELATIONSHIP, REJECT_RELATIONSHIP, ACCEPT_ONTOLOGY_CHANGE, REJECT_ONTOLOGY_CHANGE}, with `target`, `field?`, `value?`, `actor: {type: human|agent}`, `reason`, `evidence`, `status: accepted`.
- **Rule** — durable curation constraint: `type` ∈ {NEVER_MERGE, FORCE_ALIAS, CANONICAL_NAME, PIN_DEFINITION, REJECT_RELATIONSHIP, REQUIRE_PRIMARY_SOURCE, REQUIRE_MULTIPLE_SOURCES, IGNORE_SOURCE, TRUST_SOURCE_FOR_DOMAIN}; `scope` targets entity/predicate/entity-type/source-type/domain. One rule per file.
- **Proposal** — agent-authored suggested change with reason, supporting/contradicting evidence, confidence, affected records, impact analysis, generated-by metadata, status.
- **ChallengeProposal** — targets an existing decision/rule; contains current rationale, evidence for current state, new conflicting evidence, recommended change, impact analysis. Changes canonical state only when accepted.

## ChangeSet (SPEC §14)

```ts
interface ChangeSet {
  id: string;
  source?: SourceId;
  entityChanges: EntityChange[];
  assertionChanges: AssertionChange[];
  ontologyChanges: OntologyChange[];
  ruleChanges: RuleChange[];
  evidence: EvidenceRef[];
  createdBy: ActorRef;
  status: "proposed" | "validated" | "accepted" | "rejected" | "applied";
}
```

Lifecycle: `validateChangeSet()` (structural) → `previewChangeSet()` (diff) → accept → `applyChangeSet()` (atomic write, idempotent) → `rollbackChangeSet()` (reverse ops where practical). `knowledge/**` mutates through no other path.

## EnrichmentRequest (SPEC §16)

`target` + `goal` ∈ {find_primary_source, find_independent_evidence, find_implementation, find_related_research, verify_definition, resolve_conflict, identify_origin, find_counterevidence} + `context` + `priority`. Agents return evidence + proposals, never prose.

## Provenance shape (SPEC §2.5)

```ts
interface KnowledgeProvenance {
  createdBy: ActorRef;             // {type: human} | {type: agent, workflow, model, promptVersion}
  workflow?: string;
  model?: string;
  promptVersion?: string;
  verifiedBy?: ActorRef[];
  acceptedAt?: string;             // when a decision accepted it
  challengedBy?: { proposalId: string; at: string }[];
  supersededBy?: string;           // proposal/assertion ID
}
```
