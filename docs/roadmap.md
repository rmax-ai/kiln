# Roadmap

> Maps SPEC §36 to fp-workflow phases. Each phase: smallest coherent slice + tests + fixtures + docs.

## Orchestration phases (this workflow)

| FP phase | Scope |
|---|---|
| 0 — Scope | SPEC.md + architecture docs + decisions + GitHub setup ✓ (this pass) |
| 1 — Research | Stack research (Eve/Next.js static export/graph libs) — parallel with Phase 2 |
| 2 — Supporting files | AGENTS.md, companion TS docs, .gitignore, CI skeleton |
| 3 — GitHub | repo, labels, SPEC, epic/story issues |
| 4 — Implementation | Project phases 1–9 below, chained via stories |
| 5 — Verification | hard gates: lint/typecheck/test + validate-project-docs |
| 6 — Website | static explorer polish + deploy |

## Project phases (SPEC §36)

| # | Phase | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Domain foundation | monorepo, schemas, IDs, fs repos, source adapter, fixture | Markdown parses; records validate; load/save works |
| 2 | Catalog | observations + candidates, JSONL, deterministic fixtures | corpus → inspectable catalog artifacts |
| 3 | Curation model | Decision/Rule/Proposal/ChangeSet + apply/validate/preview | manual corrections persist; rebuild safe; proposals inert |
| 4 | Agentic curation | Eve agents: resolver, mapper, proposer, reconciler | agents emit proposals; zero canonical writes |
| 5 | Enrichment | EnrichmentRequest, researcher, verifier, challenges | gaps → tasks; rules challengeable, not overridable |
| 6 | Graph compiler | graph.json + derived edges + indexes + timeline + search docs | deterministic; disposable |
| 7 | Static website | Next.js explorer, all routes, graph view, search | static export, no backend |
| 8 | Evals/routing | gold sets, model runner, policies, telemetry, escalation | 2+ models compared on one task |
| 9 | Hardening | demo corpus, CI, deploy, docs polish | end-to-end demo runs clean |

## Current status

- [x] Phase 0: spec captured, architecture/domain/storage/curation docs written
- [ ] Phase 1: domain foundation (in progress)
