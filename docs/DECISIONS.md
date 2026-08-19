# Decisions

Durable architecture decisions, newest first. Format: **[D-<n>] date — decision — rationale.**

## Phase 0

**[D-7] 2026-08-19 — Repo: rmax-ai/kiln, public, MIT.** Showcase project; matches org convention.

**[D-6] 2026-08-19 — ID scheme: `{kind}:{slug}`, ULID for events, deterministic assertion/evidence slugs.** Explicit IDs are a spec invariant (SPEC §2.2); deterministic slugs make re-derivation idempotent and diffs stable.

**[D-5] 2026-08-19 — Source fixture mirrors the REAL upstream yt-insights format** (OKF-frontmatter `summary.md` + `insights.md`, sections: Core Insights / Architectural Implications / Trade-offs / Open Questions / Deep Dives / Article Ideas / Project Ideas / Key Claims / Connections). Spec's `video.md`/`insights.md` naming is illustrative; adapter keys off frontmatter `type` (Digest vs Research Note), not filenames, so upstream format evolution doesn't break ingestion.

**[D-4] 2026-08-19 — Node 22 (mise), pnpm workspace, Vitest, Biome.** Spec baseline (§3). Biome chosen over ESLint+Prettier: single tool, fast, adequate for a solo senior dev; import-boundary lint guards the layer model.

**[D-3] 2026-08-19 — Package boundaries: 14 packages per SPEC §4, but only domain/source/catalog/knowledge/curation/ontology/config/graph/workflows/cli get code in Phases 1–6.** models/enrichment/evals/telemetry/explorer are stubs until their phase. Stub packages carry package.json + README only — architectural story visible, zero dead code.

**[D-2] 2026-08-19 — Milestone 1 ships zero LLM adapters.** Deterministic path (Phases 1–3) needs no model. `MockLanguageModel` satisfies types until Phase 4. Prevents premature vendor coupling.

**[D-1] 2026-08-19 — Initial predicate registry: 8 predicates.** `addresses, uses, implements, extends, introduces, relates_to, contradicts, challenges`. Grows only via ACCEPT_ONTOLOGY_CHANGE (SPEC §8).

**[D-0] 2026-08-19 — Graph lib choice deferred to Phase 7 spike** (Graphology+Sigma vs Cytoscape). Search lib (MiniSearch vs FlexSearch) deferred likewise. No speculative deps now.
