import { z } from "zod";
import { PredicateSchema } from "./assertion.js";
import { EvidenceRefSchema } from "./common.js";
import { EntityTypeSchema } from "./entity.js";

export const ObservationSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  kind: z.enum(["claim", "mention", "topic"]),
  text: z.string(),
  section: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type Observation = z.infer<typeof ObservationSchema>;
export const CandidateEntitySchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  name: z.string(),
  normalizedName: z.string(),
  context: z.string(),
  entityTypeHints: z.array(EntityTypeSchema).optional(),
});
export type CandidateEntity = z.infer<typeof CandidateEntitySchema>;
export const CandidateAssertionSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  subjectText: z.string(),
  predicateHint: PredicateSchema.optional(),
  objectText: z.string(),
  evidence: z.array(EvidenceRefSchema),
  confidence: z.number().min(0).max(1).optional(),
});
export type CandidateAssertion = z.infer<typeof CandidateAssertionSchema>;
