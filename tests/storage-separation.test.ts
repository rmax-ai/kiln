import { mkdir, mkdtemp, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KnowledgeBase } from "@kiln/knowledge";
import { describe, expect, it } from "vitest";

describe("storage separation", () => {
  it("does not write generated/catalog or mutate canonical files while validating", async () => {
    const root = await mkdtemp(join(tmpdir(), "kiln-storage-"));
    await Promise.all(
      ["knowledge", "curation", "generated", "catalog"].map((dir) => mkdir(join(root, dir))),
    );
    const before = await Promise.all(["generated", "catalog"].map((dir) => stat(join(root, dir))));
    const kb = new KnowledgeBase(root);
    await kb.loadAll();
    expect(
      await Promise.all(["generated", "catalog"].map((dir) => readdir(join(root, dir)))),
    ).toEqual([[], []]);
    expect((await stat(join(root, "generated"))).mtimeMs).toBe(before[0]!.mtimeMs);
  });
});
