#!/usr/bin/env node
// Enforces the layer model: packages/domain imports nothing from @kiln/*,
// and every other package may only import from packages lower in the stack.
// New edges require a DECISIONS.md entry (docs/architecture.md §3).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const pkgRoot = join(root, "packages");

// Layer index kept for documentation; enforcement uses allowedImports below.

const allowedImports = {
  domain: new Set([]),
  source: new Set(["domain"]),
  catalog: new Set(["domain", "source", "ontology"]),
  ontology: new Set(["domain", "config"]),
  knowledge: new Set(["domain", "config"]),
  curation: new Set(["domain", "knowledge", "ontology", "config"]),
  enrichment: new Set(["domain", "knowledge", "curation", "config"]),
  workflows: new Set([
    "domain",
    "source",
    "catalog",
    "ontology",
    "knowledge",
    "curation",
    "enrichment",
    "models",
    "config",
    "telemetry",
  ]),
  models: new Set(["domain", "config", "telemetry"]),
  graph: new Set(["domain", "knowledge", "ontology", "config"]),
  evals: new Set(["domain", "knowledge", "curation", "models", "config", "telemetry"]),
  telemetry: new Set([]),
  config: new Set([]),
};

let violations = 0;

for (const pkg of readdirSync(pkgRoot)) {
  const srcDir = join(pkgRoot, pkg, "src");
  if (!allowedImports[pkg]) continue;
  const allowed = allowedImports[pkg];

  async function walk(dir) {
    for (const entry of await readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) await walk(p);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const text = readFileSync(p, "utf8");
        for (const m of text.matchAll(/from\s+["']@kiln\/([\w-]+)["']/g)) {
          const target = m[1];
          if (target !== pkg && !allowed.has(target)) {
            console.error(
              `BOUNDARY VIOLATION: packages/${pkg} imports @kiln/${target} (allowed: ${[...allowed].join(", ") || "none"}) in ${p.replace(root, "")}`,
            );
            violations++;
          }
        }
      }
    }
  }
  await walk(srcDir);
}

if (violations > 0) {
  console.error(`\n${violations} boundary violation(s). See docs/architecture.md §3.`);
  process.exit(1);
}
console.log("boundaries: ok");
