import { CandidateAssertionSchema, PredicateSchema } from "@kiln/domain";
import { z } from "zod";
import type { AgentDefinition } from "./types.js";

export const AssertionProposerInputSchema = z
  .object({ sourceId: z.string(), candidates: z.array(CandidateAssertionSchema) })
  .strict();
export const AssertionProposerOutputSchema = z
  .object({
    assertions: z.array(
      z
        .object({
          subjectText: z.string(),
          predicate: PredicateSchema,
          objectText: z.string(),
          confidence: z.number().min(0).max(1),
          reasoning: z.string(),
          evidenceRefs: z.array(z.string()),
        })
        .strict(),
    ),
  })
  .strict();

export type AssertionProposerInput = z.infer<typeof AssertionProposerInputSchema>;
export type AssertionProposerOutput = z.infer<typeof AssertionProposerOutputSchema>;

export const assertionProposerAgent: AgentDefinition<
  AssertionProposerInput,
  AssertionProposerOutput
> = {
  name: "assertion-proposer",
  description: "Proposes evidence-backed assertions from extracted assertion candidates.",
  task: "assertion_extraction",
  instructions:
    "Propose only assertions directly supported by candidate text. Use relates_to when the relationship is unspecified. Never invent evidence refs: every evidenceRefs entry must come from the candidate input.",
  inputSchema: AssertionProposerInputSchema,
  outputSchema: AssertionProposerOutputSchema,
};
