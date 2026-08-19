import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { KilnError, type SourceDocument, SourceDocumentSchema } from "@kiln/domain";
import { parseFrontmatter, type SourceAdapter } from "./adapter.js";

function headingKey(heading: string): string {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function parseSections(body: string): Record<string, unknown> {
  const matches = [...body.matchAll(/^##\s+(.+)\n([\s\S]*?)(?=^##\s+|(?![\s\S]))/gm)];
  const sections: Record<string, unknown> = {};
  for (const match of matches) {
    const heading = match[1]!.trim();
    const content = match[2]!.trim();
    if (headingKey(heading) !== "core_insights") {
      sections[headingKey(heading)] = content;
      continue;
    }
    sections.core_insights = [
      ...content.matchAll(/^###\s+(.+)\n([^\n]+)\n([\s\S]*?)(?=^###\s+|(?![\s\S]))/gm),
    ].map((item) => {
      const title = item[1]!.trim();
      const metaLine = item[2]!.trim();
      const detail = item[3]!;
      const meta: Record<string, string> = {};
      for (const part of metaLine.split("·")) {
        const pair = /^\s*([\w-]+):\s*(.+?)\s*$/.exec(part);
        if (pair) meta[pair[1]!] = pair[2]!;
      }
      const field = (label: string): string =>
        new RegExp(`\\*\\*${label}\\*\\*:\\s*([^\\n]+)`).exec(detail)?.[1]?.trim() ?? "";
      const evidenceBlock = /\*\*Evidence\*\*:\s*\n([\s\S]*)/.exec(detail)?.[1] ?? "";
      return {
        title,
        meta,
        why: field("Why it matters"),
        generalization: field("Generalization"),
        evidence: [...evidenceBlock.matchAll(/^\s*-\s+(.+)$/gm)].map((line) => line[1]!.trim()),
      };
    });
  }
  return sections;
}

function requiredString(fields: Record<string, unknown>, name: string, path: string): string {
  const value = fields[name];
  if (typeof value !== "string" || value.length === 0)
    throw new KilnError("SCHEMA_ERROR", `Missing ${name} in ${path}`);
  return value;
}

export class YouTubeInsightsMarkdownAdapter implements SourceAdapter {
  readonly id = "youtube-insights-markdown";
  readonly formatVersion = "2026-08";
  async listFiles(inputPath: string): Promise<string[]> {
    const entries = await readdir(inputPath, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) =>
        entry.isDirectory()
          ? this.listFiles(join(inputPath, entry.name))
          : entry.name.endsWith(".md")
            ? [join(inputPath, entry.name)]
            : [],
      ),
    );
    return nested.flat().sort();
  }
  async parseFile(path: string): Promise<SourceDocument> {
    let parsed: { frontmatter: Record<string, unknown>; body: string };
    try {
      parsed = parseFrontmatter(await readFile(path, "utf8"));
    } catch (error) {
      if (error instanceof Error) throw new KilnError("SCHEMA_ERROR", `${path}: ${error.message}`);
      throw error;
    }
    const type = requiredString(parsed.frontmatter, "type", path);
    if (type !== "Digest" && type !== "Research Note")
      throw new KilnError("SCHEMA_ERROR", `${path}: unknown frontmatter type ${type}`);
    const uri = requiredString(parsed.frontmatter, "source_uri", path);
    const videoId = new URL(uri).searchParams.get("v");
    if (!videoId || !/^[\w-]{11}$/.test(videoId))
      throw new KilnError("SCHEMA_ERROR", `${path}: invalid YouTube video ID`);
    const tags = parsed.frontmatter.tags;
    if (
      tags !== undefined &&
      (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string"))
    )
      throw new KilnError("SCHEMA_ERROR", `${path}: invalid tags`);
    const document = {
      schemaVersion: 1,
      id: `source:youtube:${videoId}`,
      type: "video" as const,
      metadata: {
        title: requiredString(parsed.frontmatter, "source_title", path),
        authors: [requiredString(parsed.frontmatter, "source_author", path)],
        publishedAt: requiredString(parsed.frontmatter, "source_published", path),
        uri,
        tags: tags as string[] | undefined,
        externalId: videoId,
      },
      content: JSON.stringify({ sections: parseSections(parsed.body) }),
      provenance: {
        producer:
          type === "Research Note"
            ? "yt-insights"
            : requiredString(parsed.frontmatter, "generated_by", path),
        generatedBy: requiredString(parsed.frontmatter, "generated_by", path),
        capturedAt: requiredString(parsed.frontmatter, "captured_at", path),
      },
      createdAt: requiredString(parsed.frontmatter, "captured_at", path),
    };
    const validated = SourceDocumentSchema.safeParse(document);
    if (!validated.success)
      throw new KilnError("SCHEMA_ERROR", `${path}: ${validated.error.message}`);
    return validated.data;
  }
}
