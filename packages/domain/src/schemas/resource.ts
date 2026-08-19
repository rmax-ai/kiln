import { z } from "zod";
import { DurableBaseSchema, KnowledgeProvenanceSchema } from "./common.js";

export const ResourceSchema = DurableBaseSchema.safeExtend({
  uri: z.string().url(),
  title: z.string(),
  kind: z.enum(["paper", "article", "repository", "documentation", "website", "video"]),
  description: z.string().optional(),
  provenance: KnowledgeProvenanceSchema,
}).strict();
export type Resource = z.infer<typeof ResourceSchema>;
