import { describe, expect, it } from "vitest";
import { assertionId, evidenceId, isUlid, makeId, makeUlid, parseId, slugify } from "./ids.js";

describe("IDs", () => {
  it("slugifies deterministically", () => {
    expect(slugify("  Café — HELLO!!! 😄  ")).toBe("caf-hello");
    expect(slugify("one___two---three")).toBe("one-two-three");
    expect(slugify(" 😄 ")).toBe("");
  });

  it("parses only valid known IDs", () => {
    const id = makeId("concept", "context-engineering");
    expect(parseId(id)).toEqual({ kind: "concept", slug: "context-engineering" });
    expect(parseId("Concept:context")).toBeNull();
    expect(parseId("unknown:context")).toBeNull();
    expect(parseId("concept:context_engineering")).toBeNull();
  });

  it("rejects non-normalized slugs", () => {
    expect(() => makeId("concept", "Context Engineering")).toThrow("normalized");
  });

  it("makes deterministic, bounded, and distinct assertion IDs", () => {
    const object = "A ".repeat(300);
    const first = assertionId("Subject", "uses", object);
    expect(first).toBe(assertionId("Subject", "uses", object));
    expect(first.length).toBeLessThanOrEqual(200);
    expect(first).not.toBe(assertionId("Subject", "uses", `${object}other`));
  });

  it("makes deterministic evidence IDs with excerpt-sensitive hashes", () => {
    expect(evidenceId("source:video-1", "00:10", "one")).toBe(
      evidenceId("source:video-1", "00:10", "one"),
    );
    expect(evidenceId("source:video-1", "00:10", "one")).not.toBe(
      evidenceId("source:video-1", "00:10", "two"),
    );
  });

  it("makes monotonic ULIDs", () => {
    const first = makeUlid();
    const second = makeUlid();
    expect(first).toHaveLength(26);
    expect(isUlid(first)).toBe(true);
    expect(second >= first).toBe(true);
  });
});
