# SPEC — Kiln: Evidence-Backed Knowledge Compiler & Curator

> Original specification, preserved verbatim as the ground-truth reference.
> Every downstream document references this file by section number.
> Status: Phase 0 (accepted 2026-08-19, Max)

---

You are a principal software architect, knowledge-graph engineer, agentic-systems engineer, knowledge-management researcher, developer-experience lead, and evaluation-methodology specialist.
Design and implement a complete, production-quality research prototype for a filesystem-first, continuously curated, evidence-backed knowledge system.

The project is intended to showcase advanced expertise in:
- agentic workflows;
- multi-stage agent orchestration;
- knowledge engineering;
- ontology design and evolution;
- knowledge graphs;
- human-in-the-loop curation;
- provenance and evidence modeling;
- agent-generated change proposals;
- model routing and cost-aware inference;
- static-site knowledge exploration;
- evaluation of agentic knowledge workflows;
- inspectable, Git-native software architecture.

The result should be concrete enough that a senior software engineer assisted by coding agents can implement it incrementally without making major architectural decisions later.

Do not build a generic RAG chatbot.
Do not build a graph database demo.
Do not make the LLM the source of truth.

The core system should behave like a knowledge compiler and curator:
- Sources provide observations.
- Curation turns observations into assertions.
- Assertions form knowledge.
- The graph is a projection of that knowledge.
- The website is a projection of the graph, sources, and provenance.

---

## 1. PROJECT CONTEXT

An existing independent project already processes YouTube videos.
That upstream system:
- ingests YouTube videos;
- uses the Gemini multimodal API;
- extracts metadata;
- transcribes or analyzes the video;
- extracts structured insights/topics;
- emits Markdown files.

Do NOT rebuild this YouTube processing pipeline.
Treat the YouTube insights project as an external producer.
This new system begins at the Markdown boundary.

Example input:
```
sources/
  youtube/
    <video-id>/
      video.md
      insights.md
```

The exact Markdown format may evolve.
Implement an adapter/parser boundary so ingestion is not hard-coded to one source format.

The architecture must later support additional source types such as:
- papers;
- technical articles;
- GitHub repositories;
- podcasts;
- conference notes;
- manually written research notes;
- documentation.

The initial demo corpus will primarily consist of talks from the AI Engineer YouTube channel.
The product itself must NOT be coupled conceptually to that channel.

## 2. CENTRAL DESIGN PRINCIPLES

### 2.1 Filesystem first
Canonical data should remain inspectable and versionable.
Use:
- Markdown for externally authored/source content where appropriate;
- JSON for durable structured records;
- JSONL for batch/intermediate collections that are scanned rather than individually addressed;
- generated JSON for graph/search/frontend artifacts.

Avoid requiring:
- PostgreSQL;
- Neo4j;
- Redis;
- a vector database;
- an always-running backend.

Those may be added later only if demonstrated requirements justify them.

### 2.2 Git-native
All important knowledge changes should produce meaningful Git diffs.
Prefer one durable record = one JSON file when the record has:
- stable identity;
- independent lifecycle;
- references from other records;
- manual curation value;
- review value.

For very large collections, support deterministic sharding by ID prefix.
Never use the filesystem path itself as entity identity.
Every record must have a stable explicit ID.

### 2.3 Separate source, catalog, knowledge, graph, and presentation
These are different layers:
```
Source corpus
    ↓
Catalog
    ↓
Curation
    ↓
Canonical knowledge base
    ↓
Graph compiler
    ↓
Generated projections
    ↓
Static knowledge explorer
```
The graph is NOT the source of truth.
The website is NOT the source of truth.
Agent state is NOT the source of truth.

### 2.4 Agents propose; durable knowledge changes explicitly
Agents should primarily produce proposals and change sets.
Agents must not silently overwrite canonical curated knowledge.
Manual decisions must remain durable.
Automated systems may challenge manual decisions using new evidence, but must create explicit proposals rather than replacing them.

### 2.5 Provenance everywhere
Every meaningful assertion or enrichment should retain enough provenance to answer:
- where did this come from?
- which source supports it?
- was it produced manually or automatically?
- which workflow generated it?
- which model generated or verified it?
- what prompt/workflow version was used?
- when was the conclusion accepted?
- has it been challenged or superseded?

### 2.6 Deterministic logic before LLM calls
Use ordinary code for:
- ID validation;
- schema validation;
- exact alias matching;
- normalized string matching;
- graph constraints;
- duplicate IDs;
- broken references;
- deterministic derived relationships;
- simple classification where rules suffice.

Only use an LLM where semantic reasoning is actually needed.

### 2.7 Model routing is part of the architecture
Different workflow stages may use different providers/models.
Do not couple domain code to a specific model vendor.
Gemini remains the upstream multimodal ingestion model, but downstream curation should support heterogeneous providers.

The architecture must allow evaluating:
`task → candidate models → quality/cost benchmark → selected model`

and escalation:
```
deterministic
    ↓
cheap model
    ↓
verification
    ↓
medium model
    ↓
strong model
    ↓
human review
```

## 3. REQUIRED TECHNOLOGY STACK

- TypeScript as the primary implementation language.
- Preferred baseline: Node.js 22+, TypeScript, pnpm workspace / monorepo, Zod, Vitest, Playwright.
- Use Eve as the preferred agent/runtime layer if it proves suitable.
  - Treat Eve strictly as an execution/orchestration runtime.
  - Do NOT make Eve-specific state or concepts part of the canonical domain model.
  - The knowledge layer must remain usable if Eve is removed later.
- Preferred frontend: Next.js, React, static export.
  - The site should deploy as static assets.
  - Use Next.js primarily for: static concept/entity/talk pages; metadata/SEO; structured navigation; interactive graph views.
  - No required runtime backend.
- Graph visualization candidates: Sigma.js, Cytoscape.js, Graphology.
  - Prefer Graphology for graph data/algorithms if useful and Sigma.js for large interactive visualization, unless Cytoscape.js materially simplifies the implementation.
- For local analytical/build querying, DuckDB may be used optionally.
  - Do not make DuckDB canonical storage.

## 4. HIGH-LEVEL REPOSITORY ARCHITECTURE

```
apps/
  cli/
  explorer/

packages/
  domain/
  source/
  catalog/
  ontology/
  knowledge/
  curation/
  enrichment/
  workflows/
  models/
  graph/
  evals/
  telemetry/
  config/

agents/
  ...

sources/
  ...

knowledge/
  entities/
  concepts/
  assertions/
  resources/
  ...

curation/
  decisions/
  rules/
  proposals/

catalog/
  ...

generated/
  graph.json
  entities.json
  assertions.json
  sources.json
  timeline.json
  search-index.json
  stats.json

tests/
fixtures/
docs/
```

Refine this layout as needed, but preserve the architectural separation.

## 5. CORE DOMAIN MODEL

Build the system around these durable abstractions:
- Source
- Evidence
- Entity
- Assertion
- Decision
- Rule

and this temporary abstraction:
- Proposal

Also support:
- Observation
- CandidateEntity
- CandidateAssertion
- ChangeSet
- EnrichmentRequest
- ChallengeProposal

Define strict schemas for every record using Zod.
Version schemas explicitly.
Records should contain: schemaVersion, id, createdAt, updatedAt where appropriate.

## 6. SOURCE MODEL

A Source represents something ingested from outside the canonical knowledge base.
Example source types: video, paper, article, repository, documentation, podcast, note.

```ts
interface SourceDocument {
  id: SourceId;
  type: SourceType;
  metadata: SourceMetadata;
  content?: string;
  provenance: SourceProvenance;
}
```

Implement source adapters.
Initial adapter: `YouTubeInsightsMarkdownAdapter`.
The adapter must convert external Markdown into normalized SourceDocument records without performing canonical knowledge decisions.

## 7. CATALOG LAYER

The catalog answers: What do the sources contain?
It must not answer: What is canonically true?

The catalog should contain source-level extracted structures such as:
- Observation
- Mention
- CandidateEntity
- CandidateAssertion
- CandidateRelationship

For batch data, JSONL is acceptable:
```
catalog/
  observations.jsonl
  entity-candidates.jsonl
  assertion-candidates.jsonl
```
or source-sharded equivalents.

Implement deterministic rebuildability where possible.
The catalog may be regenerated from source documents.
Canonical knowledge may NOT be blindly regenerated from the catalog.

## 8. ENTITY AND ONTOLOGY MODEL

Start with a deliberately small ontology.

```
Entity
├── SourceEntity
│   ├── Video
│   ├── Paper
│   ├── Article
│   ├── Repository
│   └── Documentation
│
├── Actor
│   ├── Person
│   └── Organization
│
└── KnowledgeEntity
    ├── Concept
    ├── Problem
    ├── Pattern
    ├── Technique
    ├── System
    ├── Tool
    └── Claim
```

Do not prematurely design a large ontology.
Ontology evolution must be driven by evidence from the corpus.
The ontology model should support:
- canonical IDs;
- labels;
- aliases;
- descriptions;
- parent/child relationships;
- allowed predicates;
- constraints;
- optional lifecycle/version metadata.

Represent ontology definitions using JSON or YAML as appropriate, but keep them human inspectable.

## 9. ASSERTION MODEL

Assertion is the fundamental knowledge proposition.
Do NOT use graph edges as the canonical semantic unit.

```ts
interface Assertion {
  id: AssertionId;
  subject: EntityRef;
  predicate: Predicate;
  object: EntityRef | LiteralValue;
  evidence: EvidenceRef[];
  status: "observed" | "corroborated" | "contested" | "superseded" | "rejected";
  confidence?: number;
  temporal?: { validFrom?: string; validTo?: string };
  provenance: KnowledgeProvenance;
  createdAt: string;
  updatedAt: string;
}
```

Assertions must support:
- multiple evidence items;
- conflicting evidence;
- supersession;
- manual and automatic provenance.

Graph edges should be compiled from assertions later.

## 10. EVIDENCE MODEL

Evidence represents supporting or refuting material.
Support evidence from: video timestamp, source excerpt, paper, documentation, repository, article, manual note.

```ts
interface Evidence {
  id: EvidenceId;
  source: SourceRef;
  relation: "supports" | "refutes" | "contextualizes";
  locator?: { timestampSeconds?: number; section?: string; urlFragment?: string };
  excerpt?: string;
  provenance: {
    createdBy: ActorRef;
    workflow?: string;
    model?: string;
    promptVersion?: string;
    retrievedAt?: string;
  };
}
```

Avoid excessive copied copyrighted content.
Use concise excerpts or locators.

## 11. CURATION MODEL

Manual and automated curation must be persistent.
Introduce: Decision, Rule, Proposal, ChallengeProposal.

### 11.1 Decision
A Decision records an accepted semantic change.
Operations: SET_FIELD, ADD_ALIAS, REMOVE_ALIAS, MERGE_ENTITY, SPLIT_ENTITY, RECLASSIFY_ENTITY, ADD_ASSERTION, REMOVE_ASSERTION, SUPERSEDE_ASSERTION, ACCEPT_RELATIONSHIP, REJECT_RELATIONSHIP, ACCEPT_ONTOLOGY_CHANGE, REJECT_ONTOLOGY_CHANGE.

Example:
```json
{
  "id": "decision:...",
  "target": "concept:agent-harness",
  "operation": "set_field",
  "field": "definition",
  "value": "...",
  "actor": { "type": "human" },
  "reason": "...",
  "evidence": [],
  "status": "accepted"
}
```

### 11.2 Rule
Rules affect future curation behavior.
Examples: NEVER_MERGE, FORCE_ALIAS, CANONICAL_NAME, PIN_DEFINITION, REJECT_RELATIONSHIP, REQUIRE_PRIMARY_SOURCE, REQUIRE_MULTIPLE_SOURCES, IGNORE_SOURCE, TRUST_SOURCE_FOR_DOMAIN.
Rules must support scope: specific entities, predicate, entity type, source type, domain.
Avoid one huge global rules file. Store one durable rule per file.

### 11.3 Proposal
Agents generate proposals. Proposals may suggest: entity merge, entity split, new alias, new relationship, new assertion, ontology change, definition change, curation-rule change.
Each proposal should contain: suggested change, reason, supporting evidence, contradicting evidence, confidence, affected records, impact analysis, generated-by metadata, status.

### 11.4 ChallengeProposal
Agents may challenge existing human/manual rules. They may NOT silently override them.

Example: existing manual rule "Agent Harness != Agent Runtime"; new evidence shows multiple recent primary sources use them interchangeably → agent creates ChallengeProposal.
A ChallengeProposal must contain: target decision/rule, current rationale, evidence supporting current state, new conflicting evidence, recommended change, impact analysis.
Only acceptance of the proposal changes canonical curation state.

## 12. CURATION PRECEDENCE

Recommended baseline:
1. Accepted human decision
2. Accepted reviewed agent proposal
3. Verified automated inference
4. Raw automated extraction
5. Derived graph relationship

Lower-authority knowledge must not silently override higher-authority knowledge.
Instead, conflicting lower-authority evidence should create: challenge, conflict, review item.

## 13. CURATION WORKFLOW

For every newly ingested source:
```
Source → Parse → Catalog → Extract candidates → Resolve entities
→ Load relevant existing knowledge → Load relevant curation rules
→ Map to ontology → Detect novelty → Generate assertion proposals
→ Detect contradictions → Identify enrichment gaps → Research/enrich
→ Verify evidence → Generate ChangeSet → Auto-accept safe changes per policy
→ Escalate uncertain/high-impact changes → Apply accepted ChangeSet
→ Compile graph → Generate static artifacts
```

Represent each workflow stage explicitly.
If Eve is used, make the orchestration visible and inspectable.
Do not hide critical semantic state inside prompts.

## 14. CHANGESET

All canonical mutations should flow through a ChangeSet abstraction.

```ts
interface ChangeSet {
  id: string;
  source?: SourceId;
  entityChanges: EntityChange[];
  assertionChanges: AssertionChange[];
  ontologyChanges: OntologyChange[];
  ruleChanges: RuleChange[];
  evidence: EvidenceRef[];
  createdBy: ActorRef;
  status: "proposed" | "validated" | "accepted" | "rejected" | "applied";
}
```

Implement: validateChangeSet(), previewChangeSet(), applyChangeSet(), rollbackChangeSet() where practical.
Canonical knowledge/** may only be modified through accepted ChangeSets or equivalent explicit curation commands.
A generic rebuild command must never overwrite curated knowledge.

## 15. MANUAL ENRICHMENT

Manual enrichment should use the same knowledge model as agent enrichment.
Do not create separate "manual knowledge" and "AI knowledge" silos.

A manually added paper becomes: Resource, Evidence, Assertion, Decision — with provenance createdBy.type = human.
Agent enrichment uses the same records with createdBy.type = agent.

The system should later support manually adding: resources; evidence; annotations; entity definitions; aliases; assertions; curation decisions; rules.

## 16. ENRICHMENT MODEL

Do not perform vague searches like "find related things about this video".
Enrichment must operate through explicit knowledge gaps.

```ts
interface EnrichmentRequest {
  id: string;
  target: EntityRef | AssertionRef;
  goal: "find_primary_source" | "find_independent_evidence" | "find_implementation"
      | "find_related_research" | "verify_definition" | "resolve_conflict"
      | "identify_origin" | "find_counterevidence";
  context: unknown;
  priority: number;
}
```

The curation workflow should generate enrichment requests when knowledge is incomplete.
Enrichment agents should return evidence and proposals, not arbitrary prose.

## 17. MODEL ABSTRACTION AND ROUTING

Implement a thin provider-neutral model layer.
Do not make LangChain-style model classes central to domain architecture.

```ts
interface LanguageModel {
  generate<T>(request: {
    task: TaskType;
    schema: ZodSchema<T>;
    system: string;
    input: unknown;
    temperature?: number;
  }): Promise<ModelResult<T>>;
}

interface ModelResult<T> {
  value: T;
  usage: { inputTokens?: number; outputTokens?: number; cachedTokens?: number };
  model: string;
  provider: string;
  latencyMs: number;
  estimatedCostUsd?: number;
  traceId?: string;
}
```

Implement provider adapters incrementally: Gemini, Anthropic, OpenAI, other OpenAI-compatible providers.
Do not require all adapters in milestone one.

## 18. TASK POLICIES

Each semantic workflow stage should reference a TaskPolicy rather than a hard-coded model.

```ts
interface TaskPolicy {
  task: TaskType;
  preferredTier: "deterministic" | "cheap" | "balanced" | "strong";
  qualityThreshold?: number;
  allowEscalation: boolean;
  maxCostUsd?: number;
  fallbackModels?: ModelRef[];
}
```

Candidate tasks: candidate_extraction, entity_resolution, ontology_mapping, novel_concept_detection, assertion_extraction, reconciliation, contradiction_detection, query_generation, evidence_verification, ontology_change_proposal, curation_review.
Do not initially build an opaque "AI router". Use explicit configuration.

## 19. MODEL ESCALATION

Support controlled escalation:
```
cheap model → structured result → deterministic verification → confidence sufficient?
  → yes: accept
  → no: balanced model → uncertain?
      → no: accept
      → yes: strong model
```
Track: initial model, escalation reason, final model, total cost, final decision.
This data should later support routing evaluation.

## 20. KNOWLEDGE STORAGE

```
knowledge/
  entities/
    people/ organizations/ concepts/ problems/ patterns/ techniques/ systems/ tools/
  assertions/
  resources/
  evidence/

curation/
  decisions/2026/...
  rules/entity/ predicate/ source/ domain/
  proposals/pending/ accepted/ rejected/ challenged/
```

Use one JSON file per durable record unless scale makes sharding necessary.
Support deterministic sharding later.
Use JSONL for: catalog observations, candidate records, workflow traces, benchmark results — where record-level lookup/editing is not important.

## 21. GRAPH COMPILER

Build a deterministic graph compiler.
The compiler reads canonical knowledge and produces disposable graph artifacts.

Responsibilities:
- validate all references;
- validate ontology constraints;
- convert assertions into graph edges;
- generate reverse indexes;
- generate derived relationships;
- generate adjacency maps;
- generate entity statistics;
- generate timeline artifacts;
- generate source/entity cross-links;
- generate search documents.

Distinguish curated relationships from derived relationships.
Example — Canonical: `Agent Harness --addresses--> Context Management`. Derived: `Talk A --shares_concept--> Talk B`.
Derived relationships should generally NOT be persisted in canonical knowledge. They should be rebuilt.

## 22. GRAPH ARTIFACT FORMAT

```
generated/
  graph.json entities.json assertions.json sources.json
  evidence.json timeline.json search-index.json stats.json
```

Design schemas explicitly.
Keep artifacts optimized for static frontend loading.
Support chunking/sharding if graph size grows.

## 23. SEARCH

Implement static/local search. Evaluate MiniSearch and FlexSearch.
Search should support: entity labels, aliases, definitions, talk titles, speaker names, organization names, assertions, resources.
No runtime search backend.

## 24. NEXT.JS STATIC KNOWLEDGE EXPLORER

Routes:
- /
- /talks, /talks/[id]
- /concepts, /concepts/[id]
- /entities/[id]
- /people/[id]
- /organizations/[id]
- /resources/[id]
- /graph
- /timeline
- /curation

The curation page may initially be read-only.
Do not require authentication or a server for v1.

## 25. UI REQUIREMENTS

The UI should expose not only knowledge but how knowledge was constructed.

- 25.1 Home: number of sources, concepts, assertions, evidence items; recently ingested talks; recent knowledge changes; pending curation proposals.
- 25.2 Talk page: video metadata, summary, speaker, source link, key insights, concepts discussed, claims/assertions, new concepts introduced, existing concepts reinforced, relationships, external resources, ontology changes triggered, graph neighborhood.
- 25.3 Concept page: canonical label, definition, aliases, ontology classification, related concepts, supporting talks, assertions, evidence, resources, timeline/evolution, curation history, pending challenges.
- 25.4 Graph explorer: zoom/pan, search, node filtering, entity-type filtering, edge-type filtering, select node, inspect neighborhood, navigate to entity page, limit neighborhood depth. Do not render the entire graph blindly if that harms usability. Prefer focused graph neighborhoods.
- 25.5 Timeline: concept evolution over time — first observed, repeated observations, definition changes, major related talks, new corroborating evidence, ontology changes.
- 25.6 Curation history: accepted decisions, manual enrichments, agent proposals, rejections, challenge proposals, superseded rules. Make the epistemic history visible.

## 26. OPTIONAL FUTURE CURATION UI

Design domain APIs so a future editor mode can perform: accept proposal, reject proposal, modify proposal, add evidence, add resource, correct definition, merge entities, split entity, create rule, challenge rule — but do not require a backend implementation in v1.
For v1, CLI-driven curation plus static visualization is acceptable.

## 27. CLI

Suggested commands:
```
pnpm kb ingest <path>
pnpm kb catalog
pnpm kb curate
pnpm kb enrich
pnpm kb verify
pnpm kb proposals
pnpm kb accept <proposal-id>
pnpm kb reject <proposal-id>
pnpm kb apply <changeset-id>
pnpm kb validate
pnpm kb compile
pnpm kb build
pnpm kb inspect <entity-id>
pnpm kb stats
```

Also support a complete pipeline: `pnpm kb process <source>` which runs safe stages and stops when manual review is required.
CLI output should be concise and useful.

## 28. EVE AGENT DESIGN

If using Eve, define clear agents with constrained responsibilities:
catalog-curator, entity-resolver, ontology-mapper, knowledge-reconciler, enrichment-researcher, evidence-verifier, ontology-curator, curation-reviewer.
Avoid having one giant "knowledge agent".

Each agent should have: instructions, input schema, output schema, available tools, allowed mutations, evaluation dataset, task policy.

The agent may call deterministic domain tools.
Example — entity-resolver can: searchKnowledge(), findAliases(), findSimilarEntities(), getCurationRules(); returns EntityResolutionProposal; cannot directly write knowledge files.
This restriction is important.

## 29. HUMAN-IN-THE-LOOP POLICY

Auto-accept may be allowed for:
- new source indexing;
- obvious aliases with exact deterministic match;
- derived relationships;
- low-risk metadata enrichment.

Require review for:
- entity merges;
- entity splits;
- definition replacement;
- ontology changes;
- manual-rule challenges;
- high-impact relationship changes;
- contradiction resolution;
- source trust rules.

Make these policies configuration, not hard-coded behavior.

## 30. TELEMETRY

Record workflow traces.
At minimum: workflow, stage, input IDs, output IDs, model, provider, prompt version, latency, token usage, estimated cost, verification result, escalation, decision outcome.
Use JSONL for traces initially: `telemetry/runs/2026-08-20.jsonl`.
Do not mix telemetry with canonical knowledge.

## 31. EVALUATION FRAMEWORK

Evaluation is a first-class part of the project.
Create hand-curated benchmark fixtures from a small corpus — target 10–20 talks for initial evaluation.
Build separate datasets for: entity resolution, ontology mapping, assertion extraction, contradiction detection, evidence verification, ontology novelty detection.

Measure:
- Entity resolution: correct merge, incorrect merge, missed merge, precision, recall, F1.
- Ontology mapping: classification accuracy, false novel concepts, missed novel concepts.
- Assertion extraction: precision, recall, predicate correctness, subject/object correctness.
- Evidence verification: support/refute correctness, authority quality, false-support rate.
- Curation: bad automatic mutation rate, unnecessary escalation rate, missed conflicts.
- Incremental maintenance: duplicate entity rate, orphan entity rate, unsupported assertion rate, contradiction detection rate, ontology churn, manual-rule violation rate.

## 32. MODEL EVALUATION

Model selection should be benchmarked per workflow stage.
For each candidate model record: accuracy, structured-output failure rate, latency, input tokens, output tokens, estimated cost, escalation rate.
Derive cost per accepted correct mutation as a key metric.
Support experiments comparing: all-frontier, all-cheap, fixed-stage routing, escalation routing.
Do not hard-code benchmark results. Build the infrastructure to measure them.

## 33. TESTING STRATEGY

Implement: unit tests, schema tests, fixture tests, golden-file tests, integration tests, end-to-end tests.

Critical invariants:
- generated files may be deleted/rebuilt safely;
- canonical knowledge must not change during compile;
- unaccepted proposals cannot mutate canonical knowledge;
- manual rules cannot be silently overridden;
- all references resolve;
- all durable records validate;
- graph output is deterministic (same input + same accepted knowledge = same compiled graph).

Golden-file tests are especially appropriate for: graph compiler, source parser, ChangeSet application.

## 34. FAILURE MODES TO DESIGN FOR

duplicate concepts; near-synonyms incorrectly merged; same name referring to different concepts; ontology overgrowth; contradictory sources; stale assertions; incorrect AI enrichment; unsupported claims; manual edits being overwritten; agent disagreement; broken references; partial workflow failures; provider/model outages; invalid structured output; changed source Markdown schema; huge generated graph; Git merge conflicts.
Design concrete mitigations for each.

## 35. ARCHITECTURAL INVARIANTS

- sources/** are source inputs.
- knowledge/** contains canonical curated state.
- curation/** contains durable epistemic decisions and rules.
- generated/** is disposable.
- A rebuild may delete generated/**.
- A rebuild must never recreate curated knowledge from scratch.
- Canonical knowledge changes only through explicit accepted mutations.
- Agent suggestions are proposals until accepted.
- Manual decisions survive future ingestion.
- Agents can challenge manual decisions only through evidence-backed proposals.
- The graph is a compiled projection.
- The frontend only consumes generated/canonical read models.
- Provider-specific AI code stays outside the domain model.
- Deterministic verification is preferred when possible.
- Every accepted assertion must have provenance.

## 36. IMPLEMENTATION PHASES (PROJECT MILESTONES)

- Phase 1 — Domain foundation: repository, TS workspace, schemas, IDs, filesystem repositories, validation, source adapter interface, YouTube Markdown adapter. AC: source Markdown can be parsed; records validate; knowledge records can be loaded/saved.
- Phase 2 — Catalog: catalog generation, observations, candidate entities, candidate assertions. Deterministic fixtures before agents. AC: source corpus generates inspectable catalog artifacts.
- Phase 3 — Curation model: Decision, Rule, Proposal, ChangeSet, apply/validate/preview. AC: manual corrections persist; rebuild does not remove them; unaccepted proposals cannot modify KB.
- Phase 4 — Agentic curation: Eve agents for entity resolution, ontology mapping, assertion proposal, reconciliation. AC: agents create structured proposals; no direct canonical writes.
- Phase 5 — Enrichment: EnrichmentRequest, research agent, evidence verification, challenge proposals. AC: missing evidence generates targeted enrichment tasks; manual rules can be challenged but not overwritten.
- Phase 6 — Graph compiler: graph.json, derived edges, indexes, timeline, search documents. AC: graph output deterministic; generated output disposable.
- Phase 7 — Static website: Next.js explorer. AC: talk pages, concept pages, graph explorer, search, timeline, curation history, static export.
- Phase 8 — Evals/model routing: gold datasets, candidate-model runner, routing policies, cost telemetry, escalation. AC: at least two models can be compared for one semantic task.
- Phase 9 — Showcase hardening: documentation, architecture diagrams, demo dataset, sample workflows, evaluation results, CI, static deployment.

## 37. DEVELOPER EXPERIENCE

- Commands should be predictable: pnpm install, pnpm test, pnpm lint, pnpm typecheck, pnpm kb validate, pnpm kb build, pnpm dev.
- Create realistic fixtures.
- Avoid unnecessary abstractions.
- Keep framework-specific code at boundaries.
- Prefer explicit functions and types over magic.

## 38. DOCUMENTATION

Create: README.md, docs/architecture.md, docs/domain-model.md, docs/storage.md, docs/curation.md, docs/agent-workflows.md, docs/model-routing.md, docs/evals.md, docs/demo.md.

README should explain: problem, core insight, architecture, how to run, how curation works, why filesystem storage, why graph is generated, why agents propose rather than mutate.

## 39. DEMO SCENARIO

The repository must include one compelling end-to-end demo.

Example: existing KB knows about agent frameworks, context engineering, memory. A new talk is ingested discussing agent harnesses, managed agents, context rot. Pipeline: catalogs source; extracts candidates; maps known concepts; proposes Agent Harness as a new concept; identifies relationship to Agent Runtime; detects an existing manual rule distinguishing those concepts; performs targeted enrichment; finds authoritative external evidence; proposes a challenge to the existing rule; does NOT automatically override it. User accepts or rejects the challenge. Canonical KB updates. Graph compiler regenerates artifacts. Static site shows: new concept, supporting evidence, affected talks, curation history, graph change, challenge history.

This scenario should demonstrate the architecture more clearly than a generic graph screenshot.

## 40. WHAT NOT TO BUILD

Do NOT build: generic chatbot over sources; vector-search-first RAG; Neo4j dependency; Postgres dependency; opaque autonomous agent; one giant prompt; generic agent swarm; fully automatic ontology rewriting; LLM-generated graph edges with no provenance; manual edits directly into generated graph.json; server-dependent frontend; complex RBAC/auth system.

Keep the system focused on knowledge lifecycle and curation.

## 41. FINAL DELIVERABLE EXPECTATIONS

Produce the implementation, not just a design document. Work incrementally.
At each phase: implement the smallest coherent slice; add tests; run tests/type checking; add representative fixtures; document decisions.

When faced with ambiguity, prioritize in this order:
1. inspectability
2. correct semantic boundaries
3. durable provenance
4. testability
5. simplicity
6. replaceability of agent/model infrastructure
7. cost efficiency
8. performance

Do not optimize prematurely for large-scale graph storage.
Assume the initial corpus is hundreds to low thousands of source documents, not millions.

The final result should feel like a small, rigorous knowledge-engineering platform rather than an AI demo.

The core architectural story should remain visible in the code:
```
Markdown sources → catalog → observations → agent + deterministic curation
→ evidence-backed proposals → decisions + rules → canonical filesystem knowledge base
→ deterministic graph compiler → static artifacts → Next.js knowledge explorer
```

Begin by creating:
1. the monorepo structure;
2. core domain schemas;
3. ID conventions;
4. filesystem repository abstractions;
5. one realistic YouTube Markdown fixture;
6. the source adapter;
7. architecture documentation;
8. tests proving that source data, canonical knowledge, curation state, and generated artifacts are strictly separated.

Do not implement agent orchestration until these foundations are correct.
