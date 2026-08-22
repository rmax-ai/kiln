import { z } from "zod";
import { PredicateSchema } from "./assertion.js";

export const MentionSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  text: z.string(),
  context: z.string(),
  section: z.string().optional(),
});
export type Mention = z.infer<typeof MentionSchema>;

export const CandidateRelationshipSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  subjectText: z.string(),
  predicateHint: PredicateSchema.optional(),
  objectText: z.string(),
  context: z.string(),
});
export type CandidateRelationship = z.infer<typeof CandidateRelationshipSchema>;
