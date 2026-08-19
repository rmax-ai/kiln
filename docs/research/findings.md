# Phase 1 Research Findings

> 2026-08-19. Primary sources: npm registry, installed package types (movement-lab node_modules), movement-lab + beyond-evals-lab production usage. All versions as of today.

## 1. Eve framework suitability

**Verdict: Suitable as orchestration runtime with strict boundary discipline. Pin `eve@^0.27.7`. Do not use its channels, auth, or DB integrations in Kiln.**

Evidence from the installed package (`eve@0.27.7`, movement-lab):

- Entry points are extensive: `eve` (core), `eve/react`, `eve/vue`, `eve/svelte`, `eve/next`, `eve/tools`, `eve/evals`, `eve/skills`, `eve/instructions`, `eve/sandbox` (docker / just-bash / microsandbox / vercel), `eve/channels/*` (telegram, slack, github, discord, linear…), `eve/schedules`, `eve/agents/auth`.
- React hook: `eve/react` exports `useEveAgent` + `UseEveAgentHelpers` / `UseEveAgentSnapshot` / `UseEveAgentStatus` / `PrepareSend`. Known real-world shape (movement-lab): `useEveAgent()` → `{ data, send, status }`, `send({ message })` — NOT `send("string")`.
- Agents are **filesystem-discovered**: agent definition lives at an app root (`agent/` with `instructions/`, `skills/`, `tools/`, `subagents/`, `evals/`), tools are files whose names become tool names verbatim.
- Evals are built in (`eve/evals`, `eve/evals/expect`). beyond-evals-lab pattern: wrap agents so tools call `executeTool`, run evals with `EVE_MOCK=1`, bypass the Vercel AI Gateway with `EVE_DIRECT_OPENAI=1`.
- Deps are heavy: `@libsql/client`, `drizzle-orm`, `ai@7`, `zod@4` — server-oriented runtime.

Implications for Kiln:
- Eve's agent/skill/tool/evals surface is exactly what SPEC §28 needs (instructions + input/output schemas + tools + evals per agent).
- The **channels/schedules/auth** surface is irrelevant — don't import it.
- Eve carries its own DB expectations; Kiln's canonical store must never route through Eve state. Keep Eve behind `packages/workflows` (orchestration) only; domain/knowledge packages import nothing from Eve.
- Version churn is real (0.27.x is moving fast). Isolate Eve behind one module so an upgrade is a single-file change.
- Fallback if Eve proves unsuitable at Phase 4: hand-rolled stage runner in `packages/workflows` with the same agent contract (instructions + zod schemas + tool list). The domain model loses nothing.

## 2. Graph visualization

**Verdict: Graphology (data/algorithms) + Sigma.js v3 (render). Cytoscape only if Sigma v3 shows a blocker.**

- `graphology@0.26.0` — mature, pure data layer (no DOM), graph algorithms built in.
- `sigma@3.0.3` — v3 is a major rewrite: Graphology-agnostic, native WebGL + canvas renderers, React integration. Client-side only → `'use client'` component; fine under static export (renders post-hydration).
- `cytoscape@3.34.1` — battle-tested, richer layout plugin ecosystem, heavier bundle, imperative API (worse fit with React idioms).

Kiln needs neighborhood-focused rendering (SPEC §25.4: zoom/pan, filters, node inspection, depth limits), not whole-graph force layout. Sigma v3's native WebGL handles low-thousands of nodes comfortably on weak hardware; Graphology keeps graph algorithms (degree, neighborhoods, community detection for derived stats) out of the renderer. Bundle cost is acceptable — load only on `/graph` route (dynamic import).

## 3. Static search

**Verdict: MiniSearch. Do not use FlexSearch.**

- `minisearch@7.2.0` — actively maintained, zero deps, tiny (~30KB min), supports prefix search + fuzzy + boost + field weighting + facets. Indexing ~5k docs in tens of ms — fine to index client-side from `search-index.json` at page load.
- `flexsearch@0.8.212` — effectively frozen since 2023; known ESM interop bugs and stale docs; risk not worth it.

## 4. Next.js static export

**Verdict: Next.js `16.3.1`, App Router, `output: 'export'`, `generateStaticParams` from compiled JSON.**

- Current Next is 16.x (16.3.1 today). Static export is `output: "export"` in next.config — full prerender of all routes at build.
- Dynamic routes from data: read `generated/entities.json` etc. at build time in `generateStaticParams` + page component (server-side read of committed/generated JSON — no runtime server).
- Graph/search components are client islands: `'use client'` + `dynamic(() => import(...), { ssr: false })` for the graph route to avoid WebGL SSR issues.
- Constraint: static export forbids runtime server features (no API routes used at runtime, no middleware) — aligns with Kiln's no-backend requirement.
- Build memory on this machine (3.7GiB): keep Next build to a single page-worker; expect to build with `NODE_OPTIONS=--max-old-space-size=2048`.

## 5. Zod v4

**Verdict: `zod@4.4.3`. `.safeExtend()` is real in v4; use it for refined-schema inheritance; version via `schemaVersion` field + literal types.**

- `zod@4.4.3` current. Breaking vs v3: `z.record(key, value)` now takes TWO args; `.strict()` behavior tightened; refinements evaluated in declaration order.
- `.safeExtend()` — extends a schema while preserving its refinements (v3's `.extend()` lost refinements on the base).
- Versioning pattern for filesystem records: `schemaVersion: z.literal(1)` on the base; a v2 schema is a NEW object with `schemaVersion: z.literal(2)` + migration function. Never mutate published schemas (docs/engineering/typescript.md).

## Decisions to record

- [D-8] Eve 0.27.7 pinned; boundary = packages/workflows only (decision deferred to Phase 4 spike for final go/no-go).
- [D-9] Graphology 0.26 + Sigma 3.0 for graph explorer; Cytoscape as contingency.
- [D-10] MiniSearch 7.x for static search.
- [D-11] Next.js 16.3, output:'export', generateStaticParams from generated/** JSON.
