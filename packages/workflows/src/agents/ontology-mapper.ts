import { CandidateEntitySchema, EntityTypeSchema } from "@kiln/domain";
import { z } from "zod";
import type { AgentDefinition } from "./types.js";

export const OntologyMapperInputSchema = z
  .object({ sourceId: z.string(), candidates: z.array(CandidateEntitySchema) })
  .strict();
export const OntologyMapperOutputSchema = z
  .object({
    mappings: z.array(
      z
        .object({
          candidateId: z.string(),
          entityType: EntityTypeSchema,
          confidence: z.number().min(0).max(1),
          reasoning: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

export type OntologyMapperInput = z.infer<typeof OntologyMapperInputSchema>;
export type OntologyMapperOutput = z.infer<typeof OntologyMapperOutputSchema>;

export const ontologyMapperAgent: AgentDefinition<OntologyMapperInput, OntologyMapperOutput> = {
  name: "ontology-mapper",
  description: "Maps extracted entity candidates to the smallest fitting ontology type.",
  task: "ontology_mapping",
  instructions:
    "Choose the smallest ontology type that fits each candidate. Prefer concrete types such as tool, system, or pattern over concept when the evidence supports it. Set confidence to reflect ambiguity.",
  inputSchema: OntologyMapperInputSchema,
  outputSchema: OntologyMapperOutputSchema,
};
