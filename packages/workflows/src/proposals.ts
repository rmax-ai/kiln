import { makeUlid, type Proposal, type ProposalKind, ProposalSchema } from "@kiln/domain";
import type { KnowledgeBase } from "@kiln/knowledge";

export interface ProposalOptions {
  confidence?: number;
  impactAnalysis?: string;
}

export function makeProposal(
  kind: ProposalKind,
  title: string,
  change: unknown,
  reason: string,
  generatedBy: Proposal["generatedBy"],
  opts: ProposalOptions = {},
): Proposal {
  const now = new Date().toISOString();
  return ProposalSchema.parse({
    schemaVersion: 1,
    id: makeUlid(),
    createdAt: now,
    updatedAt: now,
    kind,
    title,
    change,
    reason,
    supportingEvidence: [],
    contradictingEvidence: [],
    confidence: opts.confidence,
    affectedRecords: [],
    impactAnalysis: opts.impactAnalysis ?? "",
    generatedBy,
    status: "pending",
  });
}

export async function writeProposal(kb: KnowledgeBase, proposal: Proposal): Promise<void> {
  await kb.proposals.save(proposal);
}
