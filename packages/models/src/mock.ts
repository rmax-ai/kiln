import { StructuredOutputFailure } from "./errors.js";
import type { GenerateRequest, LanguageModel, ModelResult } from "./types.js";

export class MockLanguageModel implements LanguageModel {
  readonly id = "mock";
  readonly calls: GenerateRequest<unknown>[] = [];

  constructor(private readonly fixtures: Record<string, unknown>) {}

  async generate<T>(request: GenerateRequest<T>): Promise<ModelResult<T>> {
    this.calls.push(request as unknown as GenerateRequest<unknown>);
    if (!(request.task in this.fixtures))
      throw new Error(`MockLanguageModel: no fixture for task ${request.task}`);

    const fixture = this.fixtures[request.task];
    const parsed = request.schema.safeParse(fixture);
    if (!parsed.success)
      throw new StructuredOutputFailure(
        request.task,
        JSON.stringify(fixture) ?? String(fixture),
        parsed.error,
      );

    return {
      value: parsed.data,
      usage: { inputTokens: 1, outputTokens: 1 },
      model: "mock",
      provider: "mock",
      latencyMs: 0,
      traceId: "mock",
    };
  }
}
