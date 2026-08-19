---
type: Digest
title: The Agent Harness — Where Context Engineering Meets Runtime — Maya Okafor, ContextLabs
description: One-paragraph summary of The Agent Harness — Where Context Engineering Meets Runtime
id: urn:rmax-ai:digest:AhYkNhX9tFk
status: complete
tags:
- agent harness
- managed agents
- context rot
- context engineering
- agent runtime
confidence: high
visibility: private
source_type: youtube
source_uri: https://www.youtube.com/watch?v=AhYkNhX9tFk
source_title: The Agent Harness — Where Context Engineering Meets Runtime — Maya Okafor, ContextLabs
source_author: AI Engineer
source_published: '2026-06-11T17:00:00Z'
captured_at: '2026-08-19T08:00:00.000000+00:00'
generated_by: gemini-2.5-flash
review_status: unreviewed
---

## Overview
- **Speaker**: Maya Okafor
- **Channel**: AI Engineer
- **Main topic**: Agent harnesses as the connective layer between managed agents and the context they operate on
- **Purpose**: To argue that the harness — not the model — is where context engineering happens, and that long-running managed agents fail primarily through context rot.
Maya Okafor presents the agent harness as the under-specified middle layer of agentic systems: the code that owns a managed agent's session loop, tool execution, and state. She distinguishes the harness from the runtime it runs on, and walks through a year of production experience at ContextLabs showing that most agent failures in long-running deployments are not model errors but context failures — window drift, stale memory, and lossy compaction. She proposes treating context as a first-class system component with its own engineering discipline, and ends with the claim that recent industry writing increasingly uses "agent harness" and "agent runtime" interchangeably, which she argues erases a useful distinction.
## Topic Map
### The Harness as the Unloved Middle Layer (30-580)
- **Explanation**: Okafor opens by situating the harness between the model and the runtime: models think, runtimes execute, and harnesses decide what the agent attends to at each step.
- **Key claims**:
  - Most open-source agent frameworks are harnesses with thin runtimes, or runtimes with implicit harnesses.
  - The harness owns the context budget: what enters the window, in what order, and what is evicted.
- **Examples**:
  - A harness that rewrites tool results into compressed state deltas before appending them to the window.
### Managed Agents and the Case of the Stale Ticket (580-1150)
- **Explanation**: A production incident at ContextLabs where a support agent kept referencing a closed ticket for three consecutive sessions.
- **Key claims**:
  - The model was not wrong; its context was stale. Retraining would not have fixed it.
  - Context rot is the dominant failure mode of long-running managed agents.
- **Examples**:
  - Support agent citing ticket #4821 four days after closure.
### Context Engineering as a Discipline (1150-1720)
- **Explanation**: Okafor argues context deserves the same rigor as data engineering: budgets, freshness, compaction, and evaluation.
- **Key claims**:
  - Compaction strategies should be evaluated against downstream task accuracy, not perplexity.
  - Memory is not a feature to bolt on; it is the substrate of the harness.
- **Examples**:
  - A/B test of two compaction prompts showing a 9-point accuracy gap on follow-up questions.
### Runtime vs Harness: A Distinction Under Threat (1720-2240)
- **Explanation**: Okafor notes that recent posts and papers use "agent harness" and "agent runtime" interchangeably, and argues the distinction still matters.
- **Key claims**:
  - A runtime executes and isolates; a harness selects and composes context.
  - Conflating them makes it harder to reason about where context failures happen.
- **Examples**:
  - Two well-known industry posts from May 2026 using the terms interchangeably.
