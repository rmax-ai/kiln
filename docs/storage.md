# Storage

> References SPEC.md §2.1, §2.2, §20, §35.

## Rule: one durable record = one JSON file

A record earns its own file when it has stable identity, independent lifecycle, references from elsewhere, or review value. Everything else is JSONL.

```
sources/
  youtube/<video-id>/video.md          # upstream summary (Digest)
  youtube/<video-id>/insights.md       # upstream insights (Research Note)
  papers/<id>.md, notes/…              # future adapter inputs

knowledge/
  entities/
    people/ organizations/ concepts/ problems/ patterns/ techniques/ systems/ tools/
      <id>.json
  assertions/<id>.json
  resources/<id>.json
  evidence/<id>.json

curation/
  decisions/<YYYY>/<id>.json
  rules/{entity,predicate,source,domain}/<id>.json
  proposals/{pending,accepted,rejected,challenged}/<id>.json

catalog/
  observations.jsonl
  entity-candidates.jsonl
  assertion-candidates.jsonl

generated/            # disposable — gitignored
  graph.json entities.json assertions.json sources.json evidence.json
  timeline.json search-index.json stats.json

telemetry/runs/<YYYY-MM-DD>.jsonl
```

## Path derivation

Paths derive from IDs, never the reverse:
- `knowledge/entities/concepts/concept:agent-harness.json` → `<type-dir>/<id>.json`
- A record's path changes only if a decision reclassifies it (RECLASSIFY_ENTITY) — and that decision is itself a durable record.

## Sharding (future, deterministic)

When any collection exceeds a threshold (default: 10k records), switch to two-level sharding by ID hash prefix: `assertions/<hh>/<id>.json`. Same deterministic function everywhere; no path stored in records; migration is a mechanical rewrite.

## JSONL usage

Only for scanned collections: catalog candidates, workflow traces, benchmark results. Never for durable records — JSONL rows are not individually addressable in Git history.

## Rebuild semantics

| Command | What it may touch |
|---|---|
| `kb compile` | `generated/**` only |
| `kb catalog` | `catalog/**` only (regenerable from sources) |
| `kb apply <changeset>` | `knowledge/**`, `curation/decisions/**` via ChangeSet |
| `kb accept <proposal>` | proposal status + (optionally) generates a ChangeSet |

There is **no** command that regenerates `knowledge/**` from `catalog/**`. Tests enforce this (see tests/storage-separation).
