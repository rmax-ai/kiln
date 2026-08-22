import { type ChangeSet, ChangeSetSchema } from "@kiln/domain";
import type { KnowledgeBase } from "@kiln/knowledge";

export interface ChangeSetValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateChangeSet(
  kb: KnowledgeBase,
  changeSet: ChangeSet,
): Promise<ChangeSetValidation> {
  const parsed = ChangeSetSchema.safeParse(changeSet);
  if (!parsed.success) return { ok: false, errors: [parsed.error.message], warnings: [] };

  const errors: string[] = [];
  const warnings: string[] = [];
  const entityCreates = new Set(
    changeSet.entityChanges
      .filter((change) => change.op === "create")
      .map((change) => change.entityId ?? change.entity?.id)
      .filter((id): id is string => Boolean(id)),
  );
  const seen = new Set<string>();
  for (const change of changeSet.entityChanges) {
    const id = change.target ?? change.entityId ?? change.entity?.id;
    if (id && seen.has(id)) errors.push(`duplicate target: ${id}`);
    if (id) seen.add(id);
  }
  const assertionSeen = new Set<string>();
  for (const change of changeSet.assertionChanges) {
    const id = change.assertionId ?? change.assertion?.id;
    if (id && assertionSeen.has(id)) errors.push(`duplicate target: ${id}`);
    if (id) assertionSeen.add(id);
  }
  const ruleSeen = new Set<string>();
  for (const change of changeSet.ruleChanges) {
    const id = change.ruleId ?? change.rule?.id;
    if (id && ruleSeen.has(id)) errors.push(`duplicate target: ${id}`);
    if (id) ruleSeen.add(id);
  }

  for (const change of changeSet.entityChanges) {
    const id = change.target;
    if (["update", "merge", "split", "reclassify"].includes(change.op) && id) {
      if (!entityCreates.has(id) && !(await kb.entities.exists(id)))
        errors.push(`entity not found: ${id}`);
    }
    if (change.op === "create") {
      const createId = change.entityId ?? change.entity?.id;
      if (createId && (await kb.entities.exists(createId)))
        errors.push(`entity already exists: ${createId}`);
    }
  }
  for (const change of changeSet.assertionChanges) {
    if (["remove", "supersede", "update_status"].includes(change.op) && change.assertionId) {
      if (!(await kb.assertions.exists(change.assertionId)))
        errors.push(`assertion not found: ${change.assertionId}`);
    }
  }
  for (const change of changeSet.ruleChanges) {
    if (change.op === "supersede_rule" && change.ruleId && !(await kb.rules.exists(change.ruleId)))
      errors.push(`rule not found: ${change.ruleId}`);
  }
  if (changeSet.evidence.length > 0)
    warnings.push("evidence references are not resolved in this phase");
  if (changeSet.ontologyChanges.length > 0)
    warnings.push("ontology changes are not resolved in this phase");
  return { ok: errors.length === 0, errors, warnings };
}
