import { z } from "zod";
import { ActorRefSchema, DurableBaseSchema, EvidenceRefSchema } from "./common.js";

export const ProposalKindSchema = z.enum([
  "entity_merge",
  "entity_split",
  "new_alias",
  "new_relationship",
  "new_assertion",
  "ontology_change",
  "definition_change",
  "curation_rule_change",
]);
export type ProposalKind = z.infer<typeof ProposalKindSchema>;

export const ProposalStatusSchema = z.enum(["pending", "accepted", "rejected", "challenged"]);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

const ProposalFields = {
  kind: ProposalKindSchema,
  title: z.string(),
  change: z.unknown(),
  reason: z.string(),
  supportingEvidence: z.array(EvidenceRefSchema),
  contradictingEvidence: z.array(EvidenceRefSchema),
  confidence: z.number().min(0).max(1).optional(),
  affectedRecords: z.array(z.string()),
  impactAnalysis: z.string(),
  generatedBy: ActorRefSchema,
  status: ProposalStatusSchema,
};

export const ProposalSchema = DurableBaseSchema.safeExtend(ProposalFields).strict();
export type Proposal = z.infer<typeof ProposalSchema>;

// Extends from the durable base directly (not from ProposalSchema) — chained
// .safeExtend() with a narrowed defaulted field hits a Zod v4 type conflict.
export const ChallengeProposalSchema = DurableBaseSchema.safeExtend({
  ...ProposalFields,
  kind: z.literal("curation_rule_change"),
  status: z.literal("pending").default("pending"),
  target: z.string(),
}).strict();
export type ChallengeProposal = z.infer<typeof ChallengeProposalSchema>;
