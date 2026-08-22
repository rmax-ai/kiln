import { ChangeSetSchema } from "@kiln/domain";
import { z } from "zod";
import type { AgentDefinition } from "./types.js";

export const KnowledgeReconcilerInputSchema = z
  .object({
    sourceId: z.string(),
    resolutions: z.array(z.unknown()),
    mappings: z.array(z.unknown()),
    assertions: z.array(z.unknown()),
  })
  .strict();
export const KnowledgeReconcilerOutputSchema = ChangeSetSchema.refine(
  (changeSet) => changeSet.status === "proposed",
  { message: "Knowledge reconciler ChangeSets must be proposed", path: ["status"] },
);

export type KnowledgeReconcilerInput = z.infer<typeof KnowledgeReconcilerInputSchema>;
export type KnowledgeReconcilerOutput = z.infer<typeof KnowledgeReconcilerOutputSchema>;

export const knowledgeReconcilerAgent: AgentDefinition<
  KnowledgeReconcilerInput,
  KnowledgeReconcilerOutput
> = {
  name: "knowledge-reconciler",
  description: "Reconciles staged agent output into a proposed ChangeSet draft.",
  task: "curation_review",
  instructions:
    "Convert resolutions into entityChanges (map_to_existing becomes an update with aliases added; create_new becomes create), and assertions into add assertionChanges; skip mappings. Return a proposed ChangeSet using makeUlid() for id and new Date().toISOString() for timestamps. Created or updated entities must be complete EntitySchema-valid records with evidence: [] and provenance createdBy agent.",
  inputSchema: KnowledgeReconcilerInputSchema,
  outputSchema: KnowledgeReconcilerOutputSchema,
};
