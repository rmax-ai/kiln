import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProposalSchema } from "@kiln/domain";
import { KnowledgeBase } from "@kiln/knowledge";
import { afterEach, expect, test } from "vitest";
import { makeProposal, writeProposal } from "./proposals.js";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("builds and writes pending proposals without touching knowledge", async () => {
  const root = await mkdtemp(join(tmpdir(), "kiln-proposals-"));
  dirs.push(root);
  await mkdir(join(root, "knowledge"));
  const before = await readdir(join(root, "knowledge"));
  const proposal = makeProposal("new_entity", "Proposal", {}, "test", {
    type: "agent",
    workflow: "test",
    model: "mock",
  });
  expect(ProposalSchema.safeParse(proposal).success).toBe(true);
  expect(proposal.status).toBe("pending");
  await writeProposal(new KnowledgeBase(root), proposal);
  expect(await readdir(join(root, "curation", "proposals", "pending"))).toEqual([
    `${proposal.id}.json`,
  ]);
  expect(await readdir(join(root, "knowledge"))).toEqual(before);
});
