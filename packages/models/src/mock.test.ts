import { expect, test } from "vitest";
import { z } from "zod";
import type { StructuredOutputFailure } from "./errors.js";
import { MockLanguageModel } from "./mock.js";

const request = (input: unknown) => ({
  task: "entity_resolution" as const,
  schema: z.object({ value: z.string() }),
  system: "test",
  input,
});

test("returns schema-parsed fixture output", async () => {
  const model = new MockLanguageModel({ entity_resolution: { value: "ok", ignored: true } });
  await expect(model.generate(request({ one: 1 }))).resolves.toMatchObject({
    value: { value: "ok" },
    usage: { inputTokens: 1, outputTokens: 1 },
    model: "mock",
    provider: "mock",
    latencyMs: 0,
    traceId: "mock",
  });
});

test("throws typed errors for invalid fixture output", async () => {
  const model = new MockLanguageModel({ entity_resolution: { value: 1 } });
  await expect(model.generate(request({}))).rejects.toMatchObject({
    name: "StructuredOutputFailure",
    task: "entity_resolution",
  } satisfies Partial<StructuredOutputFailure>);
});

test("throws a plain error when a fixture is missing", async () => {
  const model = new MockLanguageModel({});
  await expect(model.generate(request({}))).rejects.toThrow(
    "MockLanguageModel: no fixture for task entity_resolution",
  );
});

test("records calls in order and remains deterministic", async () => {
  const model = new MockLanguageModel({ entity_resolution: { value: "ok" } });
  const first = await model.generate(request({ input: 1 }));
  const second = await model.generate(request({ input: 1 }));
  expect(model.calls.map((call) => call.input)).toEqual([{ input: 1 }, { input: 1 }]);
  expect(second).toEqual(first);
});
