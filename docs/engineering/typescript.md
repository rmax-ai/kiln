# TypeScript Engineering Conventions

Companion to AGENTS.md. Concrete patterns for this repo; deviations need a DECISIONS.md entry.

## Toolchain

- Node 22 (via mise, pinned in `.node-version`/`.mise.toml`)
- pnpm workspace (see AGENTS.md layer model)
- TypeScript 5.x strict: `strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: false` (false — zod inference friction), `verbatimModuleSyntax: true`
- Vitest 3.x, Biome 2.x (lint + format, single config)
- Zod v4

## pnpm workspace patterns

```jsonc
// root package.json
{
  "name": "kiln",
  "private": true,
  "packageManager": "pnpm@10.x",
  "scripts": {
    "lint": "biome check .",
    "typecheck": "pnpm -r typecheck",
    "test": "vitest run",
    "kb": "pnpm --filter @kiln/cli exec kb"
  }
}
```

- Each package: `"name": "@kiln/<name>", "exports": { ".": "./src/index.ts" }` (TS source directly — internal monorepo, no build step between packages until apps).
- Workspace catalog (`pnpm-workspace.yaml` `catalog:`) pins shared deps: `zod@^4`, `typescript`, `vitest`, `biome`.
- Never add a dep at root that belongs in a package.

## Import boundaries (lint-enforced)

```
packages/domain    ← imports nothing from @kiln/*
packages/source    ← @kiln/domain only
packages/knowledge ← @kiln/domain, @kiln/config
packages/curation  ← @kiln/domain, @kiln/knowledge, @kiln/ontology
packages/workflows ← anything except apps
```

Enforced by a small biome-compatible script (`scripts/check-boundaries.mjs`) run in `lint`. Add new edges only in DECISIONS.md.

## Zod v4 specifics

- Record schemas: `const Base = z.object({ schemaVersion: z.literal(1), id, createdAt, updatedAt })` then `.safeExtend({...})` for variants. Never mutate a published schema in place — bump to a new schema object and migrate.
- `.strict()` on all durable record schemas — unknown fields must fail loudly (they're likely an ingestion bug or a newer schema).
- Refinements run in declaration order — put cheap checks first.
- `z.discriminatedUnion("type", ...)` for entity-type and decision-operation variants.

## Filesystem records

```ts
// knowledge repository shape
interface RecordRepo<T extends DurableRecord> {
  load(id: string): Promise<T | null>;
  save(record: T): Promise<void>;   // atomic: tmp file + rename; validates before write
  list(): Promise<T[]>;
  exists(id: string): Promise<boolean>;
}
```

- Atomic writes: write `.<id>.json.tmp` → `fs.rename`. Never truncate-then-write in place.
- JSON: 2-space indent, trailing newline, stable key order (insertion order from schema field order) — makes diffs minimal and deterministic.
- No path strings in record bodies. Path = pure function of ID.

## Determinism rules

- No `Date.now()` / `Math.random()` / `crypto.randomUUID()` in: ID derivation, catalog, compiler, serialization. `createdAt` comes from the pipeline clock injected at the top level (`Clock` interface), so tests freeze it.
- ULIDs allowed for event records only (decisions/proposals/changesets) — they're inherently non-deterministic events.
- Iterate maps/objects in sorted key order anywhere output is serialized.

## Error model

- Library: typed result `Result<T, KilnError>` (neverthrow-style, hand-rolled — no dep) or thrown typed errors; no strings.
- CLI: catch at boundary → structured error + exit code. Exit codes: 0 ok, 1 validation, 2 usage, 3 provider, 4 conflict.

## Testing patterns

- Golden files: `tests/__snapshots__/<name>.golden.json` — committed, byte-compared, regenerated only via `pnpm test -u` + manual diff review.
- Fixtures: `fixtures/` committed; tests copy to `os.tmpdir()` per test — never mutate committed fixtures.
- No test depends on another test's filesystem state.
