# Model Routing

> References SPEC.md §17, §18, §19, §32.

## Layer

`packages/models` is a thin provider-neutral boundary. Domain code never imports a vendor SDK.

```ts
interface LanguageModel {
  generate<T>(req: {
    task: TaskType;
    schema: ZodSchema<T>;
    system: string;
    input: unknown;
    temperature?: number;
  }): Promise<ModelResult<T>>;
}

interface ModelResult<T> {
  value: T;
  usage: { inputTokens?: number; outputTokens?: number; cachedTokens?: number };
  model: string;
  provider: string;
  latencyMs: number;
  estimatedCostUsd?: number;
  traceId?: string;
}
```

Output is always parsed through the request's Zod schema at the boundary; parse failures are typed errors (`StructuredOutputFailure`), never raw text leakage.

## Adapters (incremental)

| Adapter | Milestone |
|---|---|
| Gemini (OpenAI-compat HTTP if available, else native REST) | Phase 4 (first) |
| OpenAI-compatible generic (`baseUrl` + key) | Phase 4 |
| Anthropic | Phase 8 (when a comparison needs it) |

Milestone one ships **zero** adapters — the deterministic path (Phases 1–3) needs no LLM. A `MockLanguageModel` (fixture-driven) satisfies types and tests until then.

## Routing = explicit config, not an opaque router (SPEC §18)

Selection: `TaskPolicy` lookup → tier → configured model per tier:

```yaml
tiers:
  cheap:    { provider: gemini, model: gemini-2.5-flash }
  balanced: { provider: gemini, model: gemini-2.5-pro }
  strong:   { provider: openai, model: gpt-5.6-terra }
```

Escalation path is the fixed ladder in docs/agent-workflows.md. Fallback models listed per task handle outages.

## Cost accounting

Every ModelResult carries usage + estimated cost; every stage run appends to `telemetry/runs/`. Aggregate metrics per task: accuracy, structured-output failure rate, latency, tokens, cost, escalation rate. Key derived metric (SPEC §32):

```
cost_per_accepted_correct_mutation =
  total_cost_of_stage_runs / accepted_mutations_that_survived_review
```

## Experiments (Phase 8)

Runner compares routing strategies on the same gold corpus:
- all-frontier (every task → strong model)
- all-cheap (every task → cheap)
- fixed-stage routing (current policies)
- escalation routing (cheap + deterministic verify + escalate)

Results are measured, not hard-coded; policies are updated from them.
