import { z } from "zod";
import { AssertionSchema, AssertionStatusSchema } from "./assertion.js";
import { ActorRefSchema, DurableBaseSchema, EvidenceRefSchema } from "./common.js";
import { EntitySchema } from "./entity.js";
import { RuleSchema } from "./rule.js";

export const ChangeStatusSchema = z.enum([
  "proposed",
  "validated",
  "accepted",
  "rejected",
  "applied",
]);
export type ChangeStatus = z.infer<typeof ChangeStatusSchema>;
export const EntityChangeSchema = z
  .object({
    op: z.enum(["create", "update", "merge", "split", "reclassify"]),
    entityId: z.string().optional(),
    entity: EntitySchema.optional(),
    target: z.string().optional(),
  })
  .strict();
export type EntityChange = z.infer<typeof EntityChangeSchema>;
export const AssertionChangeSchema = z.object({
  op: z.enum(["add", "remove", "supersede", "update_status"]),
  assertion: AssertionSchema.optional(),
  assertionId: z.string().optional(),
  status: AssertionStatusSchema.optional(),
});
export type AssertionChange = z.infer<typeof AssertionChangeSchema>;
export const OntologyChangeSchema = z.object({
  op: z.enum(["add_type", "add_predicate", "add_relationship"]),
  definition: z.unknown(),
});
export type OntologyChange = z.infer<typeof OntologyChangeSchema>;
export const RuleChangeSchema = z.object({
  op: z.enum(["add_rule", "supersede_rule"]),
  rule: RuleSchema.optional(),
  ruleId: z.string().optional(),
});
export type RuleChange = z.infer<typeof RuleChangeSchema>;
export const ChangeSetSchema = DurableBaseSchema.safeExtend({
  source: z.string().optional(),
  entityChanges: z.array(EntityChangeSchema),
  assertionChanges: z.array(AssertionChangeSchema),
  ontologyChanges: z.array(OntologyChangeSchema),
  ruleChanges: z.array(RuleChangeSchema),
  evidence: z.array(EvidenceRefSchema),
  createdBy: ActorRefSchema,
  status: ChangeStatusSchema,
})
  .strict()
  .refine(
    (changeset) =>
      changeset.entityChanges.length +
        changeset.assertionChanges.length +
        changeset.ontologyChanges.length +
        changeset.ruleChanges.length >
      0,
    { message: "ChangeSet must contain at least one change" },
  );
export type ChangeSet = z.infer<typeof ChangeSetSchema>;
