import { MockLanguageModel, StructuredOutputFailure } from "@kiln/models";
import { expect, test } from "vitest";
import { z } from "zod";
import type { AgentDefinition } from "./agents/types.js";
import { runAgent } from "./runner.js";

const definition: AgentDefinition<{ sourceId: string }, { accepted: boolean }> = {
  name: "test-agent",
  description: "Tests the runner.",
  task: "curation_review",
  instructions: "Return accepted.",
  inputSchema: z.object({ sourceId: z.string() }),
  outputSchema: z.object({ accepted: z.boolean() }),
};

test("passes the model result through", async () => {
  const model = new MockLanguageModel({ curation_review: { accepted: true } });
  await expect(runAgent(model, definition, { sourceId: "source:one" })).resolves.toMatchObject({
    value: { accepted: true },
    model: "mock",
  });
  expect(model.calls[0]).toMatchObject({
    task: "curation_review",
    input: { sourceId: "source:one" },
  });
});

test("surfaces structured output failures", async () => {
  const model = new MockLanguageModel({ curation_review: { accepted: "yes" } });
  await expect(runAgent(model, definition, { sourceId: "source:one" })).rejects.toBeInstanceOf(
    StructuredOutputFailure,
  );
});
