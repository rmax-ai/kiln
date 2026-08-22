import {
  type ActorRef,
  type ChallengeProposal,
  type ChangeSet,
  makeUlid,
  type Rule,
} from "@kiln/domain";
import type { KnowledgeBase } from "@kiln/knowledge";

export interface PrecedenceConflict {
  changeIndex: number;
  message: string;
  rule: Rule;
}

function entityMatches(rule: Rule, ids: string[], entityType?: string): boolean {
  return (
    (rule.scope.scopeType === "entity" && ids.includes(rule.scope.entityId)) ||
    (rule.scope.scopeType === "entity_type" && rule.scope.entityType === entityType)
  );
}

export async function checkPrecedence(
  kb: KnowledgeBase,
  changeSet: ChangeSet,
): Promise<PrecedenceConflict[]> {
  const activeRules = (await kb.rules.list()).filter((rule) => rule.status === "active");
  const conflicts: PrecedenceConflict[] = [];
  changeSet.entityChanges.forEach((change, changeIndex) => {
    if (change.op === "merge") {
      for (const rule of activeRules)
        if (
          rule.type === "NEVER_MERGE" &&
          entityMatches(rule, [change.target ?? "", change.entityId ?? ""], change.entity?.type)
        )
          conflicts.push({ changeIndex, message: `rule ${rule.id} prevents merge`, rule });
    }
    if (change.op === "update") {
      for (const rule of activeRules) {
        if (!entityMatches(rule, [change.target ?? ""], change.entity?.type)) continue;
        if (rule.type === "PIN_DEFINITION" && change.entity?.description !== undefined)
          conflicts.push({ changeIndex, message: `rule ${rule.id} pins definition`, rule });
        if (
          rule.type === "CANONICAL_NAME" &&
          (change.entity?.label !== undefined || change.entity?.aliases !== undefined)
        )
          conflicts.push({ changeIndex, message: `rule ${rule.id} pins canonical name`, rule });
      }
    }
  });
  const offset = changeSet.entityChanges.length;
  changeSet.assertionChanges.forEach((change, index) => {
    if (change.op !== "add" || !change.assertion) return;
    for (const rule of activeRules) {
      const predicateMatches =
        rule.scope.scopeType === "predicate" && rule.scope.predicate === change.assertion.predicate;
      const entityTypeMatches =
        rule.scope.scopeType === "entity_type" &&
        change.assertion.subject.id.startsWith(`${rule.scope.entityType}:`);
      if (rule.type === "REJECT_RELATIONSHIP" && predicateMatches)
        conflicts.push({
          changeIndex: offset + index,
          message: `rule ${rule.id} rejects relationship`,
          rule,
        });
      if (
        rule.type === "REQUIRE_MULTIPLE_SOURCES" &&
        (predicateMatches || entityTypeMatches) &&
        changeSet.evidence.length < 2
      )
        conflicts.push({ changeIndex: offset + index, message: "requires multiple sources", rule });
    }
  });
  const ruleOffset = offset + changeSet.assertionChanges.length + changeSet.ontologyChanges.length;
  changeSet.ruleChanges.forEach((change, index) => {
    if (change.op !== "supersede_rule" || !change.ruleId) return;
    const rule = activeRules.find((candidate) => candidate.id === change.ruleId);
    if (rule)
      conflicts.push({
        changeIndex: ruleOffset + index,
        message: `manual rule ${change.ruleId} cannot be silently superseded`,
        rule,
      });
  });
  return conflicts;
}

export function challengeForConflict(
  conflict: PrecedenceConflict,
  createdBy: ActorRef,
): ChallengeProposal {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: makeUlid(),
    createdAt: now,
    updatedAt: now,
    kind: "curation_rule_change",
    status: "pending",
    target: conflict.rule.id,
    title: `Challenge rule ${conflict.rule.id}`,
    change: { action: "supersede_rule", ruleId: conflict.rule.id },
    reason: conflict.message,
    supportingEvidence: [],
    contradictingEvidence: [],
    affectedRecords: [conflict.rule.id],
    impactAnalysis: `Review required before changing ${conflict.rule.id}.`,
    generatedBy: createdBy,
  };
}
