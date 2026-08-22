import type { LanguageModel, ModelResult } from "@kiln/models";
import type { AgentDefinition } from "./agents/types.js";

export function runAgent<I, O>(
  model: LanguageModel,
  definition: AgentDefinition<I, O>,
  input: I,
): Promise<ModelResult<O>> {
  return model.generate({
    task: definition.task,
    schema: definition.outputSchema,
    system: definition.instructions,
    input,
  });
}
