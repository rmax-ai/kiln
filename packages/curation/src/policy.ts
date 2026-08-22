import { type PolicyAction, policyFor } from "@kiln/config";
import type { ChangeSet } from "@kiln/domain";
import type { KnowledgeBase } from "@kiln/knowledge";
import { checkPrecedence, type PrecedenceConflict } from "./precedence.js";

export type PolicyVerdict = "auto_accept" | "require_review";

export function policyForChangeSet(changeSet: ChangeSet): {
  verdict: PolicyVerdict;
  actions: string[];
  reasons: string[];
} {
  const actions: string[] = [];
  const reasons: string[] = [];
  const add = (action: string | undefined) => {
    if (!action) {
      reasons.push("unclassified change kind");
      return;
    }
    actions.push(action);
    if (policyFor(action as PolicyAction) === "require_review")
      reasons.push(`${action} requires review`);
  };
  for (const change of changeSet.entityChanges) {
    if (change.op === "merge") add("entity_merge");
    else if (change.op === "split") add("entity_split");
    else if (change.op === "reclassify") add("ontology_change");
    else if (change.op === "create") add("new_source_indexing");
    else if (change.op === "update")
      add(
        change.entity?.description !== undefined
          ? "definition_replacement"
          : "low_risk_metadata_enrichment",
      );
  }
  for (const change of changeSet.assertionChanges) {
    if (change.op === "add")
      add(changeSet.evidence.length >= 1 && changeSet.source ? "derived_relationships" : undefined);
    else if (change.op === "update_status") add("low_risk_metadata_enrichment");
    else add("contradiction_resolution");
  }
  for (const _change of changeSet.ontologyChanges) add("ontology_change");
  for (const change of changeSet.ruleChanges)
    add(change.op === "add_rule" ? "source_trust_rule" : "manual_rule_challenge");
  return {
    verdict: reasons.length === 0 ? "auto_accept" : "require_review",
    actions,
    reasons,
  };
}

export async function evaluateChangeSet(
  kb: KnowledgeBase,
  changeSet: ChangeSet,
): Promise<{
  verdict: PolicyVerdict;
  actions: string[];
  reasons: string[];
  conflicts: PrecedenceConflict[];
}> {
  const policy = policyForChangeSet(changeSet);
  const conflicts = await checkPrecedence(kb, changeSet);
  return {
    ...policy,
    verdict: conflicts.length > 0 ? "require_review" : policy.verdict,
    reasons:
      conflicts.length > 0
        ? [...policy.reasons, ...conflicts.map((conflict) => conflict.message)]
        : policy.reasons,
    conflicts,
  };
}
