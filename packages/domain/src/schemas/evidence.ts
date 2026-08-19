import { z } from "zod";
import { DurableBaseSchema, KnowledgeProvenanceSchema, SourceRefSchema } from "./common.js";

export const EvidenceRelationSchema = z.enum(["supports", "refutes", "contextualizes"]);
export type EvidenceRelation = z.infer<typeof EvidenceRelationSchema>;
export const EvidenceSchema = DurableBaseSchema.safeExtend({
  source: SourceRefSchema,
  relation: EvidenceRelationSchema,
  locator: z
    .object({
      timestampSeconds: z.number().nonnegative().optional(),
      section: z.string().optional(),
      urlFragment: z.string().optional(),
    })
    .optional(),
  excerpt: z.string().max(2000).optional(),
  provenance: KnowledgeProvenanceSchema,
}).strict();
export type Evidence = z.infer<typeof EvidenceSchema>;
