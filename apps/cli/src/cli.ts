#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type CatalogExtraction,
  type CatalogIdSeed,
  extractCatalog,
  writeCatalog,
} from "@kiln/catalog";
import { applyChangeSet, evaluateChangeSet, previewChangeSet } from "@kiln/curation";
import { KilnError } from "@kiln/domain";
import { KnowledgeBase } from "@kiln/knowledge";
import { YouTubeInsightsMarkdownAdapter } from "@kiln/source";

const usage =
  "Usage: kb <ingest <path> | catalog <path> | apply <changeset.json> [--dry-run] | validate>\n\nCommands:\n  ingest <path>   Parse YouTube insights Markdown\n  catalog <path>  Extract deterministic catalog records\n  apply <path>    Apply a ChangeSet (or preview with --dry-run)\n  validate        Validate knowledge and curation records";
function exitFor(error: unknown): number {
  if (error instanceof KilnError && error.code === "CONFLICT") return 4;
  return 1;
}

function advanceSeed(seed: CatalogIdSeed, extraction: CatalogExtraction): CatalogIdSeed {
  return {
    observations: (seed.observations ?? 0) + extraction.observations.length,
    mentions: (seed.mentions ?? 0) + extraction.mentions.length,
    entityCandidates: (seed.entityCandidates ?? 0) + extraction.entityCandidates.length,
    assertionCandidates: (seed.assertionCandidates ?? 0) + extraction.assertionCandidates.length,
    relationshipCandidates:
      (seed.relationshipCandidates ?? 0) + extraction.relationshipCandidates.length,
  };
}

function mergeExtractions(...parts: CatalogExtraction[]): CatalogExtraction {
  return {
    observations: parts.flatMap((part) => part.observations),
    mentions: parts.flatMap((part) => part.mentions),
    entityCandidates: parts.flatMap((part) => part.entityCandidates),
    assertionCandidates: parts.flatMap((part) => part.assertionCandidates),
    relationshipCandidates: parts.flatMap((part) => part.relationshipCandidates),
  };
}

export async function main(argv: string[]): Promise<number> {
  const [command, argument] = argv;
  if (!command || command === "--help" || command === "-h") {
    console.log(usage);
    return 0;
  }
  if (command === "ingest") {
    if (!argument || argv.length !== 2) {
      console.error(usage);
      return 2;
    }
    const adapter = new YouTubeInsightsMarkdownAdapter();
    let failed = false;
    try {
      for (const path of await adapter.listFiles(argument)) {
        try {
          const source = await adapter.parseFile(path);
          console.log(`${source.id}\t${source.type}\t${source.metadata.title}`);
        } catch (error) {
          failed = true;
          console.error(`${path}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return exitFor(error);
    }
    return failed ? 1 : 0;
  }
  if (command === "catalog") {
    if (!argument || argv.length !== 2) {
      console.error(usage);
      return 2;
    }
    const adapter = new YouTubeInsightsMarkdownAdapter();
    const extractions: CatalogExtraction[] = [];
    let seed: CatalogIdSeed = {};
    let failed = false;
    try {
      for (const path of await adapter.listFiles(argument)) {
        try {
          const extraction = extractCatalog(await adapter.parseFile(path), seed);
          seed = advanceSeed(seed, extraction);
          extractions.push(extraction);
        } catch (error) {
          failed = true;
          console.error(`${path}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      const extraction = mergeExtractions(...extractions);
      await writeCatalog(join(process.cwd(), "catalog"), extraction);
      console.log(`observations.jsonl\t${extraction.observations.length}`);
      console.log(`mentions.jsonl\t${extraction.mentions.length}`);
      console.log(`entity-candidates.jsonl\t${extraction.entityCandidates.length}`);
      console.log(`assertion-candidates.jsonl\t${extraction.assertionCandidates.length}`);
      console.log(`relationship-candidates.jsonl\t${extraction.relationshipCandidates.length}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return exitFor(error);
    }
    return failed ? 1 : 0;
  }
  if (command === "apply") {
    if (!argument || (argv.length !== 2 && (argv.length !== 3 || argv[2] !== "--dry-run"))) {
      console.error(usage);
      return 2;
    }
    try {
      const changeSet = JSON.parse(await readFile(argument, "utf8"));
      const kb = new KnowledgeBase(process.cwd());
      const evaluation = await evaluateChangeSet(kb, changeSet);
      if (argv[2] === "--dry-run") {
        for (const line of previewChangeSet(changeSet)) console.log(line);
        console.log(`verdict: ${evaluation.verdict}`);
        for (const conflict of evaluation.conflicts) console.log(`conflict: ${conflict.message}`);
        return 0;
      }
      if (evaluation.verdict === "require_review" && changeSet.status !== "accepted") {
        console.error(`ChangeSet requires review: ${evaluation.reasons.join("; ")}`);
        return 4;
      }
      const result = await applyChangeSet(kb, changeSet, { autoAccept: true });
      if (!result.ok) {
        console.error(result.error.message);
        return exitFor(result.error);
      }
      if (result.value.alreadyApplied) console.log("already applied");
      else
        console.log(
          `applied ${
            changeSet.entityChanges.length +
            changeSet.assertionChanges.length +
            changeSet.ruleChanges.length +
            changeSet.ontologyChanges.length
          } changes`,
        );
      return 0;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return exitFor(error);
    }
  }
  if (command === "validate") {
    if (argv.length !== 1) {
      console.error(usage);
      return 2;
    }
    const kb = new KnowledgeBase(process.cwd());
    const loaded = await kb.loadAll();
    const warnings = [
      kb.entities,
      kb.assertions,
      kb.evidence,
      kb.resources,
      kb.decisions,
      kb.rules,
      kb.proposals,
    ].flatMap((store) => store.warnings);
    for (const warning of warnings) console.error(`INVALID ${warning.path} ${warning.message}`);
    const valid = Object.values(loaded).reduce((count, records) => count + records.length, 0);
    console.log(`${valid} records valid, ${warnings.length} invalid`);
    return warnings.length > 0 ? 1 : 0;
  }
  console.error(usage);
  return 2;
}

if (import.meta.url === `file://${process.argv[1]}`)
  process.exitCode = await main(process.argv.slice(2));
