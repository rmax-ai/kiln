import type { ChangeSet } from "@kiln/domain";

export function previewChangeSet(changeSet: ChangeSet): string[] {
  return [
    ...changeSet.entityChanges.map((change) => {
      const id = change.target ?? change.entityId ?? change.entity?.id ?? "unknown";
      if (change.op === "create")
        return `+ ${id} (create entity ${change.entity?.type ?? "unknown"})`;
      if (change.op === "update") return `~ ${id} (update entity)`;
      if (change.op === "merge")
        return `~ ${change.target ?? "unknown"} (merge from ${change.entityId ?? "unknown"})`;
      if (change.op === "split")
        return `+ ${change.entityId ?? change.entity?.id ?? "unknown"} (split from ${change.target ?? "unknown"})`;
      return `~ ${id} (reclassify entity)`;
    }),
    ...changeSet.assertionChanges.map((change) => {
      const id = change.assertionId ?? change.assertion?.id ?? "unknown";
      if (change.op === "add") return `+ ${id} (add assertion)`;
      if (change.op === "remove") return `- ${id} (remove assertion)`;
      if (change.op === "supersede") return `~ ${id} (supersede assertion)`;
      return `~ ${id} (assertion status → ${change.status ?? "unknown"})`;
    }),
    ...changeSet.ontologyChanges.map(() => "? ontology change (not applied in this phase)"),
    ...changeSet.ruleChanges.map((change) => {
      const id = change.ruleId ?? change.rule?.id ?? "unknown";
      return change.op === "add_rule"
        ? `+ ${id} (add rule ${change.rule?.type ?? "unknown"})`
        : `~ ${id} (supersede rule)`;
    }),
  ];
}
