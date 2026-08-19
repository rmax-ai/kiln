# Agent Workflows

> References SPEC.md §28. Phase 4+ content — foundations (Phases 1–3) contain **no** agent orchestration.

## Runtime stance on Eve

Eve (if suitable) is an execution/orchestration runtime only. No Eve type, session state, or message shape may appear in `packages/domain`, `packages/knowledge`, or any canonical record. The knowledge layer must run with agents disabled (deterministic path) and remain fully functional if Eve is removed. Decision deferred to Phase 4 spike (see DECISIONS.md).

## Agent roster (Phase 4)

| Agent | Inputs | Outputs | Allowed tools | Mutations |
|---|---|---|---|---|
| catalog-curator | SourceDocument | Observations, candidates | parser, normalizer | catalog/** only |
| entity-resolver | candidates + KB | EntityResolutionProposal | searchKnowledge, findAliases, findSimilarEntities, getCurationRules | proposals only |
| ontology-mapper | candidates + ontology | OntologyMappingProposal | getOntology, searchKnowledge | proposals only |
| knowledge-reconciler | proposals + KB | ChangeSet (validated) | validateChangeSet, previewChangeSet | proposals only |
| enrichment-researcher | EnrichmentRequest | Evidence + proposals | web search, source lookup | proposals only |
| evidence-verifier | assertions + evidence | VerificationReport | getEvidence, getSource | proposals only |
| ontology-curator | ontology + corpus stats | OntologyChangeProposal | getOntology, stats | proposals only |
| curation-reviewer | proposals + rules | ReviewRecommendation | read-only KB access | nothing |

**Rule: no agent gets filesystem write access to `knowledge/**`, `curation/decisions/**`, or `curation/rules/**`.** Only the deterministic `applyChangeSet()` path writes canonical state, and it runs outside agent sandboxes.

Each agent definition file (`agents/<name>.md` or .ts) carries: instructions, input schema, output schema, available tools, allowed mutations, evaluation dataset reference, task policy.

## Task policies (SPEC §18)

Stages reference `TaskPolicy` entries from `packages/config/src/task-policies.yaml`, never hard-coded model names:

```yaml
tasks:
  candidate_extraction:    { tier: cheap,     allowEscalation: true,  maxCostUsd: 0.05 }
  entity_resolution:       { tier: cheap,     allowEscalation: true,  maxCostUsd: 0.10 }
  ontology_mapping:        { tier: balanced,  allowEscalation: true,  maxCostUsd: 0.10 }
  novel_concept_detection: { tier: balanced,  allowEscalation: true,  maxCostUsd: 0.15 }
  assertion_extraction:    { tier: balanced,  allowEscalation: true,  maxCostUsd: 0.15 }
  contradiction_detection: { tier: strong,    allowEscalation: true,  maxCostUsd: 0.20 }
  evidence_verification:   { tier: strong,    allowEscalation: true,  maxCostUsd: 0.20 }
  curation_review:         { tier: strong,    allowEscalation: false }
```

## Escalation (SPEC §19)

```
cheap model → structured result → deterministic verification
  → confidence ≥ threshold? accept
  → else: balanced model → uncertain? → strong model → human review
```

Every run records: initial model, escalation reason, final model, total cost, final decision — in telemetry. This dataset feeds routing evaluation (Phase 8).

## What agents never do

- write canonical files directly
- override manual decisions/rules
- produce graph edges (edges are compiled, never generated)
- perform "vague related-things search" (enrichment is gap-driven, SPEC §16)
