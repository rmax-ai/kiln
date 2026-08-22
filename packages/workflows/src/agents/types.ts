import type { TaskType } from "@kiln/models";
import type { ZodSchema } from "zod";

export interface AgentDefinition<I, O> {
  name: string;
  description: string;
  task: TaskType;
  instructions: string;
  inputSchema: ZodSchema<I>;
  outputSchema: ZodSchema<O>;
}

export interface AgentRunResult<O> {
  agent: string;
  task: TaskType;
  model: string;
  output: O;
}
