import type { Dirent } from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChangeSet, Proposal } from "@kiln/domain";
import { KnowledgeBase } from "@kiln/knowledge";
import { afterEach, expect, test } from "vitest";
import { applyChangeSet } from "./apply.js";
import { validateChangeSet } from "./validate.js";

const now = "2026-01-01T00:00:00.000Z";
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function bytes(path: string): Promise<string[]> {
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) out.push(...(await bytes(join(path, entry.name))));
    else out.push(await readFile(join(path, entry.name), "utf8"));
  }
  return out;
}
test("pending proposals cannot mutate knowledge", async () => {
  const dir = await mkdtemp(join(tmpdir(), "kiln-"));
  dirs.push(dir);
  const kb = new KnowledgeBase(dir);
  const proposal: Proposal = {
    schemaVersion: 1,
    id: "proposal:pending",
    createdAt: now,
    updatedAt: now,
    kind: "new_assertion",
    title: "Pending",
    change: {},
    reason: "Test",
    supportingEvidence: [],
    contradictingEvidence: [],
    affectedRecords: [],
    impactAnalysis: "None",
    generatedBy: { type: "human" },
    status: "pending",
  };
  await kb.proposals.save(proposal);
  const change: ChangeSet = {
    schemaVersion: 1,
    id: "changeset:pending",
    createdAt: now,
    updatedAt: now,
    entityChanges: [{ op: "update", target: "concept:missing" }],
    assertionChanges: [],
    ontologyChanges: [],
    ruleChanges: [],
    evidence: [],
    createdBy: { type: "human" },
    status: "proposed",
  };
  const before = await bytes(join(dir, "knowledge"));
  await validateChangeSet(kb, change);
  await applyChangeSet(kb, change);
  expect(await bytes(join(dir, "knowledge"))).toEqual(before);
});
