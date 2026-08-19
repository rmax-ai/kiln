import { z } from "zod";

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
export type IsoDate = z.infer<typeof IsoDateSchema>;

export const ulidSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
export type Ulid = z.infer<typeof ulidSchema>;

export const ActorRefSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("human"), name: z.string().optional() }),
  z.object({
    type: z.literal("agent"),
    workflow: z.string(),
    model: z.string().optional(),
    promptVersion: z.string().optional(),
  }),
]);
export type ActorRef = z.infer<typeof ActorRefSchema>;

export const KnowledgeProvenanceSchema = z.object({
  createdBy: ActorRefSchema,
  workflow: z.string().optional(),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
  verifiedBy: z.array(ActorRefSchema).optional(),
  acceptedAt: IsoDateSchema.optional(),
  challengedBy: z.array(z.object({ proposalId: z.string(), at: IsoDateSchema })).optional(),
  supersededBy: z.string().optional(),
});
export type KnowledgeProvenance = z.infer<typeof KnowledgeProvenanceSchema>;

export const SourceProvenanceSchema = z.object({
  producer: z.string(),
  generatedBy: z.string().optional(),
  capturedAt: IsoDateSchema,
});
export type SourceProvenance = z.infer<typeof SourceProvenanceSchema>;

export const DurableBaseSchema = z.object({
  schemaVersion: z.number().int().positive(),
  id: z.string().min(1),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type DurableBase = z.infer<typeof DurableBaseSchema>;

export const SourceRefSchema = z.object({ id: z.string(), type: z.string().optional() });
export type SourceRef = z.infer<typeof SourceRefSchema>;
export const EntityRefSchema = z.object({ id: z.string(), label: z.string().optional() });
export type EntityRef = z.infer<typeof EntityRefSchema>;
export const EvidenceRefSchema = z.object({ id: z.string() });
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
