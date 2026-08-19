# Kiln Architecture

> References SPEC.md §2, §4, §13, §35. Decisions marked **[D-*]** are logged in DECISIONS.md.

## 1. Layer model

```
sources/**          → Source corpus (external Markdown; input only)
packages/source     → Adapters: external formats → SourceDocument
packages/catalog    → Catalog: SourceDocument → observations + candidates (JSONL)
packages/curation   → Curation: proposals, decisions, rules, ChangeSets
packages/knowledge  → Canonical store: entities, assertions, evidence, resources
packages/graph      → Compiler: canonical → generated/** (deterministic, disposable)
apps/explorer       → Static Next.js site: consumes generated/** read models only
```

Invariants (SPEC §35):
- `sources/**` are inputs; `knowledge/**` is canonical; `curation/**` is durable epistemic state; `generated/**` is disposable.
- A rebuild may delete `generated/**` but must never recreate or overwrite curated knowledge.
- Canonical knowledge mutates **only** through accepted ChangeSets or explicit curation commands.
- The frontend consumes generated/canonical read models only.

## 2. Workspace layout

```
apps/
  cli/                 # `pnpm kb …` command surface
  explorer/            # Next.js static export (Phase 7)
packages/
  domain/              # types + Zod schemas + IDs + validation. ZERO runtime deps on siblings.
  source/              # SourceDocument schema + adapters (YouTubeInsightsMarkdownAdapter first)
  catalog/             # observation/candidate extraction, JSONL store
  ontology/            # small initial taxonomy; type registry; predicate registry
  knowledge/           # filesystem repositories for durable records
  curation/            # Decision/Rule/Proposal/ChallengeProposal/ChangeSet + policies
  enrichment/          # EnrichmentRequest + gap detection (Phase 5)
  workflows/           # pipeline stages; orchestrates packages below it
  models/              # provider-neutral LanguageModel + adapters (Gemini/Anthropic/OpenAI-compat)
  graph/               # deterministic compiler → generated/**
  evals/               # benchmark datasets, metrics, experiments (Phase 8)
  telemetry/           # JSONL run traces (workflow, model, cost, outcome)
  config/              # TaskPolicies, auto-accept thresholds, escalation tiers
agents/                # Eve agent definitions (Phase 4) — runtime layer only
sources/               # source corpus (git-committed inputs)
knowledge/             # canonical records (see docs/storage.md)
curation/              # decisions, rules, proposals
catalog/               # JSONL observations/candidates (rebuildable)
generated/             # disposable artifacts (gitignored, rebuilt by `kb compile`)
tests/                 # cross-package integration + e2e tests
fixtures/              # realistic fixtures (sources + expected outputs)
docs/                  # this documentation set
```

## 3. Dependency direction (enforced)

```
config → domain
source → domain
ontology → domain, config
knowledge → domain, config
curation → domain, knowledge, ontology
catalog → domain, source, ontology
enrichment → domain, knowledge, curation
models → domain, config, telemetry
workflows → all of the above (never imported by domain/knowledge)
graph → domain, knowledge, ontology
cli → everything
explorer → generated/** + canonical read models only
```

Rule: **`packages/domain` has no imports from any sibling package.** Anyone can import domain; domain imports no one. `pnpm lint` enforces this with an import-boundary check (see AGENTS.md).

## 4. ID conventions

All IDs are explicit, stable, and kind-prefixed. **Filesystem paths are derived from IDs; paths are never identity** (SPEC §2.2).

```
{kind}:{slug}
kinds: source, concept, problem, pattern, technique, system, tool, claim,
       person, organization, video, paper, article, repository, documentation,
       podcast, note, assertion, evidence, resource, decision, rule, proposal,
       changeset, enrichment
```

- **Entity IDs** — `concept:context-engineering`, `person:ryan-dahl`, `tool:claw-patrol`. Slug = normalized canonical label (lowercase, kebab, ASCII-fold). Collisions resolved exactly once at creation by appending a deterministic suffix; renames happen only via MERGE/RENAME decisions which leave redirect records.
- **Source IDs** — `source:youtube:<video-id>` (external stable ID preserved).
- **Assertion IDs** — `assertion:<subj-slug>-<pred-slug>-<obj-slug>`; deterministic so re-derivation from the same source is idempotent. Uniqueness enforced at write; conflicts become review items.
- **Evidence IDs** — `evidence:<source-slug>-<hash8>` from (source, locator, excerpt) hash.
- **Event IDs** (decision, proposal, changeset, enrichment) — ULIDs, time-sortable, no cross-run determinism required.

ID validation is deterministic code (`packages/domain/src/ids.ts`), never an LLM.

## 5. Data flow per stage (SPEC §13)

```
ingest    → sources/<type>/<id>/  (adapter: Markdown → SourceDocument)
catalog   → catalog/observations.jsonl, entity-candidates.jsonl, assertion-candidates.jsonl
curate    → proposals (pending/); deterministic auto-accept of safe changes; review items otherwise
apply     → ChangeSet application → knowledge/** + curation/decisions/**
compile   → generated/graph.json, entities.json, assertions.json, sources.json,
            evidence.json, timeline.json, search-index.json, stats.json
build     → apps/explorer static export consuming generated/**
```

Each stage emits telemetry to `telemetry/runs/YYYY-MM-DD.jsonl` (workflow, stage, IDs, model, provider, prompt version, latency, tokens, cost, verification result, escalation, outcome).

## 6. Trust boundaries

- `knowledge/**` — writes only via `applyChangeSet()` / explicit curation commands (SPEC §14).
- `curation/proposals/**` — agents write here; nothing else reads proposals as truth.
- `generated/**` — only the graph compiler writes; only the explorer reads (via read models).
- Agent sandboxes: no filesystem write access to `knowledge/**` or `curation/decisions|rules/**` (SPEC §28).

## 7. Determinism before LLMs (SPEC §2.6)

Exact matching, normalization, ID validation, schema validation, reference resolution, duplicate detection, graph constraint checks, and derived relationships are **plain code**. LLMs are invoked only at stages declared in `packages/config` TaskPolicies: candidate extraction, entity resolution, ontology mapping, novelty detection, assertion extraction, contradiction detection, evidence verification.

## 8. Failure-mode mitigations (SPEC §34 — summary)

| Failure | Mitigation |
|---|---|
| Duplicate concepts / near-synonyms | deterministic normalization + resolver proposals + REQUIRED review for merges |
| Same name, different concepts | context evidence required on entity records; NEVER_MERGE rules |
| Ontology overgrowth | new types require ACCEPT_ONTOLOGY_CHANGE decision; churn metric in evals |
| Contradictory sources | assertion status `contested` + challenge proposals, never silent overwrite |
| Stale assertions | temporal validity + supersession decisions + staleness report in stats.json |
| Manual edits overwritten | precedence + ChangeSet-only mutation + manual-rule violation rate metric |
| Broken references | compiler validates all refs; compile fails loudly with structured errors |
| Invalid structured output | Zod parse at model boundary; structured-output failure rate telemetry |
| Provider outage | TaskPolicy fallbackModels + deterministic fallback stages |
| Changed source schema | adapter versioning + golden-file parser tests |
| Huge generated graph | chunking by entity type; explorer renders neighborhoods, not full graph |
| Git conflicts on knowledge files | one-record-per-file; records are immutable-after-write (edits = new revision via decisions) |

## 9. Open questions

- Graphology vs Sigma.js vs Cytoscape.js — decide at Phase 7 after a spike (SPEC §3).
- MiniSearch vs FlexSearch — decide at Phase 7 (SPEC §23).
- DuckDB for analytical queries at build time — optional, only if stats/reporting needs justify it (SPEC §3).
- Eve suitability — evaluate at Phase 4; the domain model must not depend on it either way (SPEC §3).
