# Decisions

Durable architecture decisions, newest first. Format: **[D-<n>] date — decision — rationale.**

## Phase 0

**[D-11] 2026-08-19 — Next.js 16.3, `output: "export"`, `generateStaticParams` from generated/** JSON.** Per research findings §4.

**[D-10] 2026-08-19 — MiniSearch 7.x for static search.** FlexSearch is effectively frozen (0.8.212, no real maintenance since 2023). Findings §3.

**[D-9] 2026-08-19 — Graphology 0.26 (data/algorithms) + Sigma.js 3.0 (render) for the graph explorer.** Sigma v3 is Graphology-agnostic WebGL/canvas; Cytoscape is the contingency. Graph route loads it via dynamic import, client-only. Findings §2.

**[D-8] 2026-08-19 — Eve pinned at ^0.27.7, boundary = packages/workflows only.** Suitable as orchestration runtime (agents/skills/tools/evals surface verified from installed package), but carries heavy server deps (libsql, drizzle) — never import its channels/auth/schedules; canonical state never routes through Eve. Final go/no-go at Phase 4 spike; fallback is a hand-rolled stage runner with the same agent contract. Findings §1.

**[D-7] 2026-08-19 — Repo: rmax-ai/kiln, public, MIT.** Showcase project; matches org convention.

**[D-6] 2026-08-19 — ID scheme: `{kind}:{slug}`, ULID for events, deterministic assertion/evidence slugs.** Explicit IDs are a spec invariant (SPEC §2.2); deterministic slugs make re-derivation idempotent and diffs stable.

**[D-5] 2026-08-19 — Source fixture mirrors the REAL upstream yt-insights format** (OKF-frontmatter `summary.md` + `insights.md`, sections: Core Insights / Architectural Implications / Trade-offs / Open Questions / Deep Dives / Article Ideas / Project Ideas / Key Claims / Connections). Spec's `video.md`/`insights.md` naming is illustrative; adapter keys off frontmatter `type` (Digest vs Research Note), not filenames, so upstream format evolution doesn't break ingestion.

**[D-4] 2026-08-19 — Node 22 (mise), pnpm workspace, Vitest, Biome.** Spec baseline (§3). Biome chosen over ESLint+Prettier: single tool, fast, adequate for a solo senior dev; import-boundary lint guards the layer model.

**[D-3] 2026-08-19 — Package boundaries: 14 packages per SPEC §4, but only domain/source/catalog/knowledge/curation/ontology/config/graph/workflows/cli get code in Phases 1–6.** models/enrichment/evals/telemetry/explorer are stubs until their phase. Stub packages carry package.json + README only — architectural story visible, zero dead code.

**[D-2] 2026-08-19 — Milestone 1 ships zero LLM adapters.** Deterministic path (Phases 1–3) needs no model. `MockLanguageModel` satisfies types until Phase 4. Prevents premature vendor coupling.

**[D-1] 2026-08-19 — Initial predicate registry: 8 predicates.** `addresses, uses, implements, extends, introduces, relates_to, contradicts, challenges`. Grows only via ACCEPT_ONTOLOGY_CHANGE (SPEC §8).

**[D-0] 2026-08-19 — Graph lib choice deferred to Phase 7 spike** (Graphology+Sigma vs Cytoscape). Search lib (MiniSearch vs FlexSearch) deferred likewise. No speculative deps now.
