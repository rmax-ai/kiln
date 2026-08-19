import { basename, dirname, join } from "node:path";
import {
  type Assertion,
  AssertionSchema,
  type Decision,
  DecisionSchema,
  type Entity,
  EntitySchema,
  type Evidence,
  EvidenceSchema,
  KilnError,
  type Proposal,
  ProposalSchema,
  type Resource,
  ResourceSchema,
  type Rule,
  RuleSchema,
} from "@kiln/domain";
import { RecordRepo } from "./repo.js";

const entityDirs: Record<string, string> = {
  video: "videos",
  paper: "papers",
  article: "articles",
  repository: "repositories",
  documentation: "documentation",
  person: "people",
  organization: "organizations",
  concept: "concepts",
  problem: "problems",
  pattern: "patterns",
  technique: "techniques",
  system: "systems",
  tool: "tools",
  claim: "claims",
};
export const entityStore = (root: string) =>
  new RecordRepo<Entity>(root, {
    schema: EntitySchema,
    listDir: "entities",
    dirFor: (id) => {
      const dir = entityDirs[id.split(":", 1)[0] ?? ""];
      if (!dir) throw new KilnError("INVALID_ID", `Invalid entity ID: ${id}`);
      return join("entities", dir);
    },
  });
export const assertionStore = (root: string) =>
  new RecordRepo<Assertion>(root, { schema: AssertionSchema, listDir: "assertions" });
export const evidenceStore = (root: string) =>
  new RecordRepo<Evidence>(root, { schema: EvidenceSchema, listDir: "evidence" });
export const resourceStore = (root: string) =>
  new RecordRepo<Resource>(root, { schema: ResourceSchema, listDir: "resources" });
export const decisionStore = (root: string) =>
  new RecordRepo<Decision>(root, {
    schema: DecisionSchema,
    listDir: "decisions",
    dirFor: (_id, record) => join("decisions", record?.createdAt.slice(0, 4) ?? "0000"),
  });
export const ruleStore = (root: string) =>
  new RecordRepo<Rule>(root, {
    schema: RuleSchema,
    listDir: "rules",
    dirFor: (_id, record) =>
      join(
        "rules",
        record?.scope.scopeType === "entity_type"
          ? "entity"
          : (record?.scope.scopeType ?? "entity"),
      ),
  });
export const proposalStore = (root: string) =>
  new RecordRepo<Proposal>(root, {
    schema: ProposalSchema,
    listDir: "proposals",
    dirFor: (_id, record) => join("proposals", record?.status ?? "pending"),
  });

export class KnowledgeBase {
  readonly entities: RecordRepo<Entity>;
  readonly assertions: RecordRepo<Assertion>;
  readonly evidence: RecordRepo<Evidence>;
  readonly resources: RecordRepo<Resource>;
  readonly decisions: RecordRepo<Decision>;
  readonly rules: RecordRepo<Rule>;
  readonly proposals: RecordRepo<Proposal>;
  constructor(root: string) {
    const knowledgeRoot = basename(root) === "knowledge" ? root : join(root, "knowledge");
    const curationRoot =
      basename(root) === "knowledge" ? join(dirname(root), "curation") : join(root, "curation");
    this.entities = entityStore(knowledgeRoot);
    this.assertions = assertionStore(knowledgeRoot);
    this.evidence = evidenceStore(knowledgeRoot);
    this.resources = resourceStore(knowledgeRoot);
    this.decisions = decisionStore(curationRoot);
    this.rules = ruleStore(curationRoot);
    this.proposals = proposalStore(curationRoot);
  }
  async loadAll(): Promise<{
    entities: Entity[];
    assertions: Assertion[];
    evidence: Evidence[];
    resources: Resource[];
    decisions: Decision[];
    rules: Rule[];
    proposals: Proposal[];
  }> {
    const [entities, assertions, evidence, resources, decisions, rules, proposals] =
      await Promise.all([
        this.entities.list(),
        this.assertions.list(),
        this.evidence.list(),
        this.resources.list(),
        this.decisions.list(),
        this.rules.list(),
        this.proposals.list(),
      ]);
    return { entities, assertions, evidence, resources, decisions, rules, proposals };
  }
}
