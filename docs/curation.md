# Curation

> References SPEC.md §11, §12, §13, §14, §29.

## Precedence (SPEC §12)

```
1. accepted human decision
2. accepted reviewed agent proposal
3. verified automated inference
4. raw automated extraction
5. derived graph relationship
```

Lower authority never silently overwrites higher authority. A conflict between levels produces a `ChallengeProposal` or review item — never an implicit edit.

## Pipeline (SPEC §13)

```
Source → Parse → Catalog → Extract candidates → Resolve entities
→ Load existing knowledge → Load rules → Map to ontology → Detect novelty
→ Generate assertion proposals → Detect contradictions → Identify enrichment gaps
→ Research/enrich → Verify evidence → Generate ChangeSet
→ Auto-accept safe changes (per policy) → Escalate uncertain/high-impact
→ Apply accepted ChangeSet → Compile graph → Generate static artifacts
```

Each stage is an explicit function in `packages/workflows/src/stages/`, with its own input/output types and telemetry emission. No hidden prompt state.

## Auto-accept vs review (SPEC §29 — configuration, not code)

`packages/config/src/policies.yaml`:

```yaml
autoAccept:
  - new_source_indexing
  - exact_alias_match          # deterministic only
  - derived_relationships
  - low_risk_metadata_enrichment
requireReview:
  - entity_merge
  - entity_split
  - definition_replacement
  - ontology_change
  - manual_rule_challenge
  - high_impact_relationship_change
  - contradiction_resolution
  - source_trust_rule
```

## ChangeSet application rules (SPEC §14, §35)

1. `validateChangeSet()` — structural: schemas, ID uniqueness, reference resolution.
2. `previewChangeSet()` — computed diff; printed by `kb apply --dry-run`.
3. `applyChangeSet()` — atomic: write temp files → rename; idempotent on retry; refuses if a validation error exists.
4. `rollbackChangeSet()` — reverse operations; records the rollback as a decision.

Unaccepted proposals cannot touch `knowledge/**` — enforced by tooling (write access boundary) **and** by tests that run the pipeline with a pending proposal and assert canonical files are byte-identical.

## Manual edits (SPEC §15)

A human adds a paper: it becomes Resource + Evidence + Assertion + Decision with `actor: {type: human}`. Same records, same schemas — no "human knowledge" vs "AI knowledge" silo. `kb add-resource`, `kb add-assertion`, `kb add-rule` wrap this in the future (Phase 3+).

## Challenge flow (SPEC §11.4)

```
new evidence conflicts with accepted rule/decision
  → agent creates ChallengeProposal (target, current rationale, both evidence sets,
     recommended change, impact analysis)
  → review item
  → accepted? canonical state changes via decision, proposal archived to accepted/
  → rejected? proposal archived to rejected/; conflict logged; rule stands
```

The demo scenario (SPEC §39) exercises exactly this path.
