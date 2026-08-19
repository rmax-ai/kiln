import { join } from "node:path";
import { YouTubeInsightsMarkdownAdapter } from "@kiln/source";
import { describe, expect, it } from "vitest";

describe("YouTubeInsightsMarkdownAdapter", () => {
  it("parses every Markdown fixture by its frontmatter type", async () => {
    const adapter = new YouTubeInsightsMarkdownAdapter();
    const files = await adapter.listFiles(
      join(process.cwd(), "fixtures/sources/youtube/AhYkNhX9tFk"),
    );
    const sources = await Promise.all(files.map((file) => adapter.parseFile(file)));
    expect(sources).toHaveLength(2);
    for (const source of sources) {
      expect(source.id).toBe("source:youtube:AhYkNhX9tFk");
      expect(source.metadata).toMatchObject({
        externalId: "AhYkNhX9tFk",
        authors: ["AI Engineer"],
      });
    }
    const research = sources.find((source) => source.provenance.producer === "yt-insights");
    const sections = JSON.parse(research!.content!).sections;
    expect(sections.core_insights).toHaveLength(5);
    expect(sections.core_insights[0].evidence.length).toBeGreaterThan(0);
  });
});
