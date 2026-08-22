import { CandidateEntitySchema } from "@kiln/domain";
import { z } from "zod";
import type { AgentDefinition } from "./types.js";

export const EntityResolverInputSchema = z
  .object({ sourceId: z.string(), candidates: z.array(CandidateEntitySchema) })
  .strict();
const ResolutionSchema = z
  .object({
    candidateId: z.string(),
    action: z.enum(["map_to_existing", "create_new", "skip"]),
    entityId: z.string().optional(),
    label: z.string().optional(),
    aliases: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  })
  .strict()
  .superRefine((resolution, context) => {
    if (resolution.action === "create_new" && !resolution.label)
      context.addIssue({ code: "custom", message: "create_new requires label", path: ["label"] });
  });
export const EntityResolverOutputSchema = z
  .object({ resolutions: z.array(ResolutionSchema) })
  .strict();

export type EntityResolverInput = z.infer<typeof EntityResolverInputSchema>;
export type EntityResolverOutput = z.infer<typeof EntityResolverOutputSchema>;

export const entityResolverAgent: AgentDefinition<EntityResolverInput, EntityResolverOutput> = {
  name: "entity-resolver",
  description: "Resolves extracted entity candidates against the existing knowledge base.",
  task: "entity_resolution",
  instructions:
    "Match candidates against provided knowledge with the deterministic tools. Map to an existing entity only on an exact or near-exact alias match; create_new proposes a canonical entity with label and aliases derived from the candidate name; skip when ambiguous. Never fabricate IDs: entityId must reference an existing entity, otherwise omit it.",
  inputSchema: EntityResolverInputSchema,
  outputSchema: EntityResolverOutputSchema,
};
