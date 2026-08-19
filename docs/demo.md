# Demo Scenario

> References SPEC.md §39. This is the end-to-end story the repo must tell.

## Setup

The committed demo corpus (`sources/demo/`) starts from a small KB:

- Concepts: `concept:agent-framework`, `concept:context-engineering`, `concept:memory`
- A manual rule (in `curation/rules/domain/`): `PIN_DEFINITION agent-harness != agent-runtime` — "agent harness" and "agent runtime" are distinct; don't merge.

## New talk ingested

`kb process sources/demo/youtube/<talk-id>/` — a talk discussing **agent harnesses, managed agents, context rot**.

1. **catalog** — observations + candidate entities (`agent harness`, `managed agent`, `context rot`) extracted.
2. **curate** — entity resolution maps known concepts; `agent-harness` is new → `NovelConceptProposal`; relationship to `agent-runtime` detected; existing manual rule surfaces as a constraint.
3. **enrich** — gap detection issues `EnrichmentRequest(goal: find_primary_source | find_independent_evidence)` for the harness/runtime distinction; research agent returns authoritative evidence that recent primary sources use the terms interchangeably.
4. **challenge** — agent files `ChallengeProposal` against the PIN_DEFINITION rule. **The rule is not touched.**
5. **human review** — `pnpm kb proposals` shows the challenge; user accepts or rejects:
   - accepted → rule superseded via decision; assertions updated; canonical KB changes.
   - rejected → challenge archived; rule stands; conflict logged.
6. **compile** — graph regenerated: new concept node, evidence links, affected talks, curation history.
7. **site** — concept page shows definition evolution, evidence, curation history including the challenge; graph explorer shows the neighborhood change; timeline shows first-observed → challenged → resolved.

## Why this scenario beats a screenshot

It demonstrates, in one run: adapter boundary, catalog/curation separation, proposal-not-mutation, precedence enforcement, gap-driven enrichment, evidence-backed challenge, human-in-the-loop decision, deterministic recompilation, and epistemic history in the UI.
