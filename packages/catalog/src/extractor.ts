import {
  type CandidateAssertion,
  type CandidateEntity,
  type CandidateRelationship,
  type Mention,
  type Observation,
  type Predicate,
  type SourceDocument,
  slugify,
} from "@kiln/domain";

export interface CatalogIdSeed {
  observations?: number;
  mentions?: number;
  entityCandidates?: number;
  assertionCandidates?: number;
  relationshipCandidates?: number;
}

export interface CatalogExtraction {
  observations: Observation[];
  mentions: Mention[];
  entityCandidates: CandidateEntity[];
  assertionCandidates: CandidateAssertion[];
  relationshipCandidates: CandidateRelationship[];
}

interface Claim {
  heading: string;
  section: string;
  confidence?: number;
  evidence: string[];
}

interface ParsedContent {
  sections: string[];
  claims: Claim[];
  headings: ({ kind: "topic"; text: string } | { kind: "claim"; claim: Claim })[];
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "on",
  "with",
  "for",
  "at",
  "by",
  "to",
  "from",
  "not",
  "is",
  "was",
  "are",
  "its",
  "that",
  "what",
  "why",
  "how",
  "when",
  "which",
]);

function confidenceFromMetadata(line: string | undefined): number | undefined {
  if (!line) return undefined;
  const evidence = line
    .split("·")
    .map((part) => part.trim())
    .find((part) => part.startsWith("evidence:"))
    ?.slice("evidence:".length)
    .trim();
  if (evidence === "strong") return 0.9;
  if (evidence === "medium") return 0.6;
  if (evidence === "weak") return 0.3;
  return undefined;
}

function parseMarkdown(content: string): ParsedContent {
  const sections: string[] = [];
  const claims: Claim[] = [];
  const headings: ParsedContent["headings"] = [];
  let section: string | undefined;
  let claim: Claim | undefined;
  let inEvidence = false;
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const sectionMatch = /^##\s+(.+?)\s*$/.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1]!.trim();
      sections.push(section);
      headings.push({ kind: "topic", text: section });
      claim = undefined;
      inEvidence = false;
      continue;
    }

    const claimMatch = /^###\s+(.+?)\s*$/.exec(line);
    if (claimMatch) {
      claim = {
        heading: claimMatch[1]!.trim(),
        section: section ?? "",
        evidence: [],
      };
      const confidence = confidenceFromMetadata(lines[index + 1]);
      if (confidence !== undefined) claim.confidence = confidence;
      claims.push(claim);
      headings.push({ kind: "claim", claim });
      inEvidence = false;
      continue;
    }

    if (/^\*\*Evidence\*\*:\s*$/.test(line.trim())) {
      inEvidence = true;
      continue;
    }
    if (!inEvidence || !claim) continue;
    const evidenceMatch = /^\s*-\s+"(.*)"\s*$/.exec(line);
    if (evidenceMatch) claim.evidence.push(evidenceMatch[1]!);
  }
  return { sections, claims, headings };
}

function titleFromSectionKey(key: string): string {
  return key
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function parseAdapterContent(content: string): ParsedContent | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || !("sections" in parsed)) return undefined;
  const sectionsValue = parsed.sections;
  if (!sectionsValue || typeof sectionsValue !== "object" || Array.isArray(sectionsValue))
    return undefined;

  const sections: string[] = [];
  const claims: Claim[] = [];
  const headings: ParsedContent["headings"] = [];
  for (const [key, value] of Object.entries(sectionsValue)) {
    const section = titleFromSectionKey(key);
    sections.push(section);
    headings.push({ kind: "topic", text: section });
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const title = "title" in item ? item.title : undefined;
      if (typeof title !== "string") continue;
      const meta = "meta" in item ? item.meta : undefined;
      const evidence = "evidence" in item ? item.evidence : undefined;
      const metadata =
        meta && typeof meta === "object" && "evidence" in meta && typeof meta.evidence === "string"
          ? `evidence: ${meta.evidence}`
          : undefined;
      const claim: Claim = { heading: title, section, evidence: [] };
      const confidence = confidenceFromMetadata(metadata);
      if (confidence !== undefined) claim.confidence = confidence;
      if (Array.isArray(evidence)) {
        claim.evidence = evidence.filter((item): item is string => typeof item === "string");
      }
      claims.push(claim);
      headings.push({ kind: "claim", claim });
    }
  }
  return { sections, claims, headings };
}

function titleCasePhrases(heading: string): string[] {
  const words = heading.match(/[A-Za-z][A-Za-z0-9'-]*/g) ?? [];
  const phrases: string[] = [];
  let run: string[] = [];
  const addRun = () => {
    if (
      run.length >= 2 &&
      run.length <= 4 &&
      !run.some((word) => STOPWORDS.has(word.toLowerCase()))
    )
      phrases.push(run.join(" ").replace(/[.,;:!?]+$/, ""));
    run = [];
  };
  for (const word of words) {
    if (/^[A-Z]/.test(word)) run.push(word);
    else addRun();
  }
  addRun();
  return phrases;
}

function sourceKey(sourceId: string): string {
  return sourceId.replace(/^source:/, "");
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function extractCatalog(
  document: SourceDocument,
  seed: CatalogIdSeed = {},
): CatalogExtraction {
  const content = document.content ?? "";
  const parsed = parseAdapterContent(content) ?? parseMarkdown(content);
  const key = sourceKey(document.id);
  const observations: Observation[] = [];
  const mentions: Mention[] = [];
  const assertionCandidates: CandidateAssertion[] = [];
  const ids = {
    obs: seed.observations ?? 0,
    men: seed.mentions ?? 0,
    ent: seed.entityCandidates ?? 0,
    ass: seed.assertionCandidates ?? 0,
    rel: seed.relationshipCandidates ?? 0,
  };

  for (const heading of parsed.headings) {
    if (heading.kind === "topic") {
      observations.push({
        id: `obs:${key}:${ids.obs++}`,
        sourceId: document.id,
        kind: "topic",
        text: heading.text,
      });
      continue;
    }
    const claim = heading.claim;
    const observation: Observation = {
      id: `obs:${key}:${ids.obs++}`,
      sourceId: document.id,
      kind: "claim",
      text: claim.heading,
    };
    if (claim.section) observation.section = claim.section;
    if (claim.confidence !== undefined) observation.confidence = claim.confidence;
    observations.push(observation);
    assertionCandidates.push({
      id: `ass:${key}:${ids.ass++}`,
      sourceId: document.id,
      subjectText: claim.heading,
      objectText: claim.section,
      evidence: [],
    });
    for (const evidence of claim.evidence) {
      const mention: Mention = {
        id: `men:${key}:${ids.men++}`,
        sourceId: document.id,
        text: evidence,
        context: claim.heading,
      };
      if (claim.section) mention.section = claim.section;
      mentions.push(mention);
    }
  }

  const names: { name: string; normalizedName: string }[] = [];
  for (const name of [...(document.metadata.tags ?? []), ...document.metadata.authors]) {
    const normalizedName = slugify(name);
    if (!names.some((candidate) => candidate.normalizedName === normalizedName))
      names.push({ name, normalizedName });
  }
  for (const claim of parsed.claims) {
    for (const name of titleCasePhrases(claim.heading)) {
      const normalizedName = slugify(name);
      if (!names.some((candidate) => candidate.normalizedName === normalizedName))
        names.push({ name, normalizedName });
    }
  }

  const entityCandidates = names
    .map((candidate) => {
      const context = parsed.claims.find((claim) =>
        claim.heading.toLowerCase().includes(candidate.name.toLowerCase()),
      )?.heading;
      return {
        ...candidate,
        context: context ?? document.metadata.title,
      };
    })
    .sort((left, right) => compareStrings(left.normalizedName, right.normalizedName))
    .map(
      (candidate): CandidateEntity => ({
        id: `ent:${key}:${ids.ent++}`,
        sourceId: document.id,
        ...candidate,
      }),
    );

  const relationships: Omit<CandidateRelationship, "id" | "sourceId">[] = [];
  for (const claim of parsed.claims) {
    const matched = entityCandidates.filter((candidate) =>
      claim.heading.toLowerCase().includes(candidate.name.toLowerCase()),
    );
    for (let left = 0; left < matched.length; left += 1) {
      for (let right = left + 1; right < matched.length; right += 1) {
        const leftName = matched[left]!.name;
        const rightName = matched[right]!.name;
        const [subjectText, objectText]: [string, string] =
          compareStrings(leftName, rightName) <= 0 ? [leftName, rightName] : [rightName, leftName];
        if (
          !relationships.some(
            (relationship) =>
              relationship.subjectText === subjectText &&
              relationship.objectText === objectText &&
              relationship.context === claim.heading,
          )
        ) {
          relationships.push({
            subjectText,
            predicateHint: "relates_to" as Predicate,
            objectText,
            context: claim.heading,
          });
        }
      }
    }
  }
  const relationshipCandidates = relationships
    .sort(
      (left, right) =>
        compareStrings(left.subjectText, right.subjectText) ||
        compareStrings(left.objectText, right.objectText) ||
        compareStrings(left.context, right.context),
    )
    .map(
      (relationship): CandidateRelationship => ({
        id: `rel:${key}:${ids.rel++}`,
        sourceId: document.id,
        ...relationship,
      }),
    );

  return { observations, mentions, entityCandidates, assertionCandidates, relationshipCandidates };
}
