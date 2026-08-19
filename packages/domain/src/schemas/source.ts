import { z } from "zod";
import { IsoDateSchema, SourceProvenanceSchema } from "./common.js";

export const SourceTypeSchema = z.enum([
  "video",
  "paper",
  "article",
  "repository",
  "documentation",
  "podcast",
  "note",
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const SourceMetadataSchema = z
  .object({
    title: z.string(),
    authors: z.array(z.string()),
    publishedAt: IsoDateSchema.optional(),
    uri: z.string().url().optional(),
    tags: z.array(z.string()).optional(),
    externalId: z.string().optional(),
  })
  .strict();
export type SourceMetadata = z.infer<typeof SourceMetadataSchema>;

export const SourceDocumentSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    id: z.string().regex(/^source:/),
    type: SourceTypeSchema,
    metadata: SourceMetadataSchema,
    content: z.string().optional(),
    provenance: SourceProvenanceSchema,
    createdAt: IsoDateSchema,
  })
  .strict();
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
