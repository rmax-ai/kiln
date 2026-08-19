import { z } from "zod";
import { DurableBaseSchema, EntityRefSchema } from "./common.js";

export const EnrichmentGoalSchema = z.enum([
  "find_primary_source",
  "find_independent_evidence",
  "find_implementation",
  "find_related_research",
  "verify_definition",
  "resolve_conflict",
  "identify_origin",
  "find_counterevidence",
]);
export type EnrichmentGoal = z.infer<typeof EnrichmentGoalSchema>;
export const EnrichmentRequestSchema = DurableBaseSchema.safeExtend({
  target: z.union([EntityRefSchema, z.object({ assertionId: z.string() })]),
  goal: EnrichmentGoalSchema,
  context: z.unknown(),
  priority: z.number().int().min(1).max(10),
}).strict();
export type EnrichmentRequest = z.infer<typeof EnrichmentRequestSchema>;
