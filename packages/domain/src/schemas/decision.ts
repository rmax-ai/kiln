import { z } from "zod";
import { ActorRefSchema, DurableBaseSchema, EvidenceRefSchema, ulidSchema } from "./common.js";

export const DecisionOperationSchema = z.enum([
  "SET_FIELD",
  "ADD_ALIAS",
  "REMOVE_ALIAS",
  "MERGE_ENTITY",
  "SPLIT_ENTITY",
  "RECLASSIFY_ENTITY",
  "ADD_ASSERTION",
  "REMOVE_ASSERTION",
  "SUPERSEDE_ASSERTION",
  "ACCEPT_RELATIONSHIP",
  "REJECT_RELATIONSHIP",
  "ACCEPT_ONTOLOGY_CHANGE",
  "REJECT_ONTOLOGY_CHANGE",
]);
export type DecisionOperation = z.infer<typeof DecisionOperationSchema>;
export const DecisionSchema = DurableBaseSchema.safeExtend({
  id: ulidSchema,
  target: z.string(),
  operation: DecisionOperationSchema,
  field: z.string().optional(),
  value: z.unknown().optional(),
  actor: ActorRefSchema,
  reason: z.string().min(1),
  evidence: z.array(EvidenceRefSchema),
  status: z.literal("accepted"),
}).strict();
export type Decision = z.infer<typeof DecisionSchema>;
