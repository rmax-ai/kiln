#!/usr/bin/env node
import { KilnError } from "@kiln/domain";
import { KnowledgeBase } from "@kiln/knowledge";
import { YouTubeInsightsMarkdownAdapter } from "@kiln/source";

const usage =
  "Usage: kb <ingest <path> | validate>\n\nCommands:\n  ingest <path>  Parse YouTube insights Markdown\n  validate       Validate knowledge and curation records";
function exitFor(error: unknown): number {
  if (error instanceof KilnError && error.code === "CONFLICT") return 4;
  return 1;
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
