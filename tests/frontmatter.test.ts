import { KilnError } from "@kiln/domain";
import { parseFrontmatter } from "@kiln/source";
import { describe, expect, it } from "vitest";

describe("frontmatter", () => {
  it("parses block arrays, flow arrays, multiline scalars, and CRLF", () => {
    const parsed = parseFrontmatter(
      "---\r\ntags:\r\n- one\r\n- two\r\nflow: [a, 2]\r\ndescription:\r\n  first line\r\n  second line\r\n---\r\nbody",
    );
    expect(parsed.frontmatter).toEqual({
      tags: ["one", "two"],
      flow: ["a", 2],
      description: "first line\nsecond line",
    });
    expect(parsed.body).toBe("body");
  });
  it("rejects missing frontmatter", () => {
    expect(() => parseFrontmatter("body")).toThrow(KilnError);
  });
});
