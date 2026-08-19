import { z } from "zod";
import { PredicateSchema } from "./assertion.js";
import { DurableBaseSchema } from "./common.js";
import { EntityTypeSchema } from "./entity.js";
import { SourceTypeSchema } from "./source.js";

export const RuleTypeSchema = z.enum([
  "NEVER_MERGE",
  "FORCE_ALIAS",
  "CANONICAL_NAME",
  "PIN_DEFINITION",
  "REJECT_RELATIONSHIP",
  "REQUIRE_PRIMARY_SOURCE",
  "REQUIRE_MULTIPLE_SOURCES",
  "IGNORE_SOURCE",
  "TRUST_SOURCE_FOR_DOMAIN",
]);
export type RuleType = z.infer<typeof RuleTypeSchema>;
export const RuleScopeSchema = z.discriminatedUnion("scopeType", [
  z.object({ scopeType: z.literal("entity"), entityId: z.string() }),
  z.object({ scopeType: z.literal("predicate"), predicate: PredicateSchema }),
  z.object({ scopeType: z.literal("entity_type"), entityType: EntityTypeSchema }),
  z.object({ scopeType: z.literal("source_type"), sourceType: SourceTypeSchema }),
  z.object({ scopeType: z.literal("domain"), domain: z.string() }),
]);
export type RuleScope = z.infer<typeof RuleScopeSchema>;
export const RuleSchema = DurableBaseSchema.safeExtend({
  type: RuleTypeSchema,
  scope: RuleScopeSchema,
  rationale: z.string().min(1),
  status: z.enum(["active", "superseded"]),
  supersededBy: z.string().optional(),
}).strict();
export type Rule = z.infer<typeof RuleSchema>;
