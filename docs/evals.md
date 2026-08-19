# Evaluations

> References SPEC.md §31, §32, §33.

## Datasets (hand-curated, Phase 8)

From a 10–20 talk corpus, one gold file per task:

| Dataset | Shape |
|---|---|
| entity-resolution | candidates → {merge groups, distinct entities, missed merges} |
| ontology-mapping | entity → correct type; flag truly-novel concepts |
| assertion-extraction | source → gold assertions (subject/predicate/object + status) |
| contradiction-detection | source pairs → gold conflicts |
| evidence-verification | (assertion, evidence) → supports/refutes/contextualizes |
| novelty-detection | concept list → {new, known} |

Gold files live in `packages/evals/gold/` (committed); nothing in `knowledge/**` is auto-generated from them.

## Metrics

- **Entity resolution**: correct/incorrect/missed merges → precision, recall, F1
- **Ontology mapping**: classification accuracy; false-novel rate; missed-novel rate
- **Assertion extraction**: precision, recall; predicate correctness; subject/object correctness
- **Evidence verification**: support/refute correctness; authority quality; false-support rate
- **Curation**: bad-automatic-mutation rate; unnecessary-escalation rate; missed-conflict rate
- **Incremental maintenance** (re-ingest same source N times): duplicate-entity rate; orphan-entity rate; unsupported-assertion rate; contradiction-detection rate; ontology churn; manual-rule violation rate

## Model benchmarking

Per candidate model per task: accuracy, structured-output failure rate, latency, tokens, cost, escalation rate → `cost_per_accepted_correct_mutation`. Runner: `pnpm kb evals run --experiment escalation-routing`.

## Testing strategy (SPEC §33)

- **Unit** — ID normalization, schema validation, single stage logic.
- **Schema** — every record type round-trips; rejects malformed.
- **Fixture** — real-shaped source Markdown parses to expected SourceDocument.
- **Golden-file** — graph compiler, source parser, ChangeSet application: committed expected outputs, byte-compared.
- **Integration** — full pipeline on fixtures in a temp dir; **E2E** — `kb process` end-to-end on the demo corpus.

Critical invariants covered by tests:

| Invariant | Test |
|---|---|
| generated/** disposable | compile → hash → delete → compile → same hash |
| compile never mutates knowledge/** | hash knowledge/** before/after compile |
| unaccepted proposals can't mutate KB | pipeline with pending proposal → knowledge/** byte-identical |
| manual rules not silently overridden | conflict fixture → ChallengeProposal created, rule intact |
| all references resolve | `kb validate` runs ref checker over full corpus |
| deterministic graph | two compiles in fresh dirs → identical outputs |
