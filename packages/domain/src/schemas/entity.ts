import { z } from "zod";
import { slugify } from "../ids.js";
import { DurableBaseSchema, EvidenceRefSchema, KnowledgeProvenanceSchema } from "./common.js";

export const EntityTypeSchema = z.enum([
  "video",
  "paper",
  "article",
  "repository",
  "documentation",
  "person",
  "organization",
  "concept",
  "problem",
  "pattern",
  "technique",
  "system",
  "tool",
  "claim",
]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export function aliasesAreSlugified(aliases: string[]): boolean {
  return aliases.every((alias) => alias === slugify(alias));
}
export function labelIsNonEmpty(label: string): boolean {
  return label.trim().length > 0;
}

export const EntitySchema = DurableBaseSchema.safeExtend({
  type: EntityTypeSchema,
  label: z.string(),
  aliases: z.array(z.string()),
  description: z.string().optional(),
  evidence: z.array(EvidenceRefSchema),
  provenance: KnowledgeProvenanceSchema,
})
  .strict()
  .refine((entity) => labelIsNonEmpty(entity.label), {
    message: "Entity label must be non-empty",
    path: ["label"],
  })
  .refine((entity) => aliasesAreSlugified(entity.aliases), {
    message: "Entity aliases must be slugified",
    path: ["aliases"],
  });
export type Entity = z.infer<typeof EntitySchema>;
