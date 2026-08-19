# Kiln

**A filesystem-first, evidence-backed knowledge compiler and curator.**

Kiln turns messy Markdown sources into a durable, inspectable, human-curated knowledge base — then compiles that knowledge into a graph, a search index, and a static website. Agents propose. Humans decide. Every claim carries provenance. Git is the store, and every layer is plain text.

## Problem

Existing AI knowledge systems are either:
- **RAG chatbots** — the LLM is the source of truth, retrieval is a black box, and there is no durable, reviewable knowledge;
- **graph-database demos** — impressive visuals, but the graph edges are hand-written or LLM-sprayed with no evidence, no provenance, and no lifecycle.

Kiln's position: a knowledge system is a *compiler with a review process*, not a database with a chatbot on top.

## Core insight

```
Markdown sources        (externally produced, untrusted-but-useful)
      ↓ parse + catalog
observations            (what did the source say?)
      ↓ deterministic + agent curation
proposals               (agents suggest; never mutate)
      ↓ human/rule decisions
canonical knowledge     (entities, assertions, evidence, decisions, rules)
      ↓ deterministic compiler
generated artifacts     (graph.json, search-index.json, stats.json — disposable)
      ↓
static website          (Next.js export, no backend)
```

**The graph is a projection, not the truth.** Delete `generated/` and nothing of value is lost — the compiler rebuilds it bit-for-bit deterministically. The knowledge base lives in `knowledge/**` and `curation/**` as one JSON file per durable record, with meaningful Git diffs.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full picture. In brief:

| Layer | Directory | Content | Authority |
|---|---|---|---|
| Source corpus | `sources/**` | External Markdown (YouTube insights, papers, notes…) | Input |
| Catalog | `catalog/**` | Observations, candidate entities/assertions (JSONL) | Rebuildable |
| Knowledge | `knowledge/**` | Entities, assertions, evidence, resources | Canonical |
| Curation | `curation/**` | Decisions, rules, proposals | Canonical (epistemic) |
| Generated | `generated/**` | Graph, search index, stats | Disposable |
| Explorer | `apps/explorer` | Next.js static export | Projection |

Layers are enforced by the type system: `packages/domain` contains only types and validation; each stage imports only what is below it.

## How to run

```bash
pnpm install
pnpm kb validate      # validate all durable records
pnpm kb ingest <path> # ingest a source directory (e.g. fixtures/sources/youtube/<id>)
pnpm kb process <path># full safe pipeline: catalog → curate → compile, stops at review gates
pnpm kb compile       # rebuild generated/** deterministically
pnpm kb build         # compile + build static site
pnpm dev              # dev server for the explorer
pnpm test             # vitest
pnpm lint / pnpm typecheck
```

## How curation works

1. A new source is parsed into a `SourceDocument` (adapter boundary — `YouTubeInsightsMarkdownAdapter` is the first).
2. The catalog stage extracts observations and candidate entities/assertions — deterministic where possible.
3. Curating agents resolve entities, map to the ontology, detect novelty and contradictions, and write **proposals**.
4. Deterministic policies auto-accept *safe* changes; everything else becomes a review item.
5. Accepted changes are applied via a `ChangeSet` — the only path by which `knowledge/**` mutates.
6. Manual decisions (and the rules derived from them) outrank agents. Agents can only *challenge* them with evidence.

## Why filesystem storage

- Git-native: every knowledge change is a reviewable diff; history *is* the audit log.
- Inspectable: `cat knowledge/entities/concepts/agent-harness.json` — no client, no daemon, no vendor.
- Zero infrastructure: no Postgres, Neo4j, Redis, or vector DB required to operate, test, or deploy.
- Scale envelope is explicit: hundreds to low thousands of sources, not millions. If that changes, deterministic sharding by ID prefix is the escape hatch — not a rewrite.

## Why the graph is generated

If curated edges were hand-maintained, two representations of truth would drift apart. The compiler derives the graph from canonical assertions every time, so:
- graph output is deterministic and disposable;
- assertions (with evidence, status, provenance) remain the semantic unit — edges are just their projection;
- derived relationships (e.g. `Talk A --shares_concept--> Talk B`) are never stored, only rebuilt.

## Why agents propose rather than mutate

The failure mode of every autonomous knowledge pipeline is silent corruption: the model confidently writes a wrong fact into the base, and no one can tell what changed or why. Kiln's answer:

1. **Precedence**: human decision > reviewed agent proposal > verified inference > raw extraction > derived edge. Lower authority can never silently overwrite higher authority.
2. **Explicitness**: agents emit proposals with evidence, impact analysis, and generated-by metadata. Applying them is a separate, recorded act.
3. **Challenge, not override**: when new evidence contradicts a manual rule, the agent files a `ChallengeProposal`. The canonical state only changes when a human accepts it.

## Status

Phase 1 (domain foundation) — see [docs/roadmap.md](docs/roadmap.md) and [SPEC.md](SPEC.md).
