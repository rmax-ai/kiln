export const AutoAcceptPolicy = [
  "new_source_indexing",
  "exact_alias_match",
  "derived_relationships",
  "low_risk_metadata_enrichment",
] as const;
export const ReviewPolicy = [
  "entity_merge",
  "entity_split",
  "definition_replacement",
  "ontology_change",
  "manual_rule_challenge",
  "high_impact_relationship_change",
  "contradiction_resolution",
  "source_trust_rule",
] as const;

export type PolicyAction = (typeof AutoAcceptPolicy)[number] | (typeof ReviewPolicy)[number];
export function policyFor(action: PolicyAction): "auto_accept" | "require_review" {
  return (AutoAcceptPolicy as readonly string[]).includes(action)
    ? "auto_accept"
    : "require_review";
}
