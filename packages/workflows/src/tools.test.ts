import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Entity } from "@kiln/domain";
import { KnowledgeBase } from "@kiln/knowledge";
import { afterEach, expect, test } from "vitest";
import { findAliases, findSimilarEntities, getOntology, searchKnowledge } from "./tools.js";

const now = "2026-01-01T00:00:00.000Z";
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function seededKnowledgeBase(): Promise<KnowledgeBase> {
  const root = await mkdtemp(join(tmpdir(), "kiln-workflows-"));
  dirs.push(root);
  const kb = new KnowledgeBase(root);
  const entities: Entity[] = [
    {
      schemaVersion: 1,
      id: "concept:agent-harness",
      createdAt: now,
      updatedAt: now,
      type: "concept",
      label: "Agent Harness",
      aliases: ["harness"],
      evidence: [],
      provenance: { createdBy: { type: "human" } },
    },
    {
      schemaVersion: 1,
      id: "concept:context-rot",
      createdAt: now,
      updatedAt: now,
      type: "concept",
      label: "Context Rot",
      aliases: ["context-rot"],
      evidence: [],
      provenance: { createdBy: { type: "human" } },
    },
    {
      schemaVersion: 1,
      id: "system:harness-runtime",
      createdAt: now,
      updatedAt: now,
      type: "system",
      label: "Harness Runtime",
      aliases: ["runtime"],
      evidence: [],
      provenance: { createdBy: { type: "human" } },
    },
  ];
  await Promise.all(entities.map((entity) => kb.entities.save(entity)));
  return kb;
}

test("searches knowledge deterministically", async () => {
  const kb = await seededKnowledgeBase();
  expect((await searchKnowledge(kb, "harness")).map((hit) => hit.id)).toEqual([
    "concept:agent-harness",
    "system:harness-runtime",
  ]);
  await expect(findAliases(kb, "harness")).resolves.toEqual([
    { entityId: "concept:agent-harness", label: "Agent Harness", alias: "harness" },
  ]);
  expect((await findSimilarEntities(kb, "Harness"))[0]?.id).toBe("concept:agent-harness");
  expect(getOntology()).toMatchObject({
    entityTypes: expect.arrayContaining(["concept"]),
    predicates: expect.arrayContaining(["relates_to"]),
  });
});
