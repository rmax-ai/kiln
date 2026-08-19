import { z } from "zod";
import {
  DurableBaseSchema,
  EntityRefSchema,
  EvidenceRefSchema,
  IsoDateSchema,
  KnowledgeProvenanceSchema,
} from "./common.js";

export const PredicateSchema = z.enum([
  "addresses",
  "uses",
  "implements",
  "extends",
  "introduces",
  "relates_to",
  "contradicts",
  "challenges",
]);
export type Predicate = z.infer<typeof PredicateSchema>;
export const LiteralValueSchema = z.union([
  z.object({ type: z.literal("string"), value: z.string() }),
  z.object({ type: z.literal("number"), value: z.number() }),
  z.object({ type: z.literal("boolean"), value: z.boolean() }),
  z.object({ type: z.literal("date"), value: IsoDateSchema }),
]);
export type LiteralValue = z.infer<typeof LiteralValueSchema>;
export const AssertionStatusSchema = z.enum([
  "observed",
  "corroborated",
  "contested",
  "superseded",
  "rejected",
]);
export type AssertionStatus = z.infer<typeof AssertionStatusSchema>;

export const AssertionSchema = DurableBaseSchema.safeExtend({
  subject: EntityRefSchema,
  predicate: PredicateSchema,
  object: z.union([EntityRefSchema, LiteralValueSchema]),
  evidence: z.array(EvidenceRefSchema),
  status: AssertionStatusSchema,
  confidence: z.number().min(0).max(1).optional(),
  temporal: z
    .object({ validFrom: IsoDateSchema.optional(), validTo: IsoDateSchema.optional() })
    .optional(),
  provenance: KnowledgeProvenanceSchema,
})
  .strict()
  .refine((assertion) => assertion.evidence.length > 0, {
    message: "Assertions require evidence",
    path: ["evidence"],
  });
export type Assertion = z.infer<typeof AssertionSchema>;
