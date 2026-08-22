import type { ZodSchema } from "zod";

export const TaskTypes = [
  "candidate_extraction",
  "entity_resolution",
  "ontology_mapping",
  "novel_concept_detection",
  "assertion_extraction",
  "contradiction_detection",
  "evidence_verification",
  "curation_review",
] as const;
export type TaskType = (typeof TaskTypes)[number];

export interface ModelUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
}

export interface ModelResult<T> {
  value: T;
  usage: ModelUsage;
  model: string;
  provider: string;
  latencyMs: number;
  estimatedCostUsd?: number;
  traceId?: string;
}

export interface GenerateRequest<T> {
  task: TaskType;
  schema: ZodSchema<T>;
  system: string;
  input: unknown;
  temperature?: number;
}

export interface LanguageModel {
  readonly id: string;
  generate<T>(request: GenerateRequest<T>): Promise<ModelResult<T>>;
}
