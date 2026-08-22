import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  type Assertion,
  type ChangeSet,
  type Entity,
  err,
  type Result,
  type Rule,
} from "@kiln/domain";
import type { KnowledgeBase } from "@kiln/knowledge";
import { validateChangeSet } from "./validate.js";

export interface ApplyResult {
  applied: boolean;
  alreadyApplied: boolean;
  skippedOntology: number;
  warnings: string[];
}

interface JournalEntry {
  op: string;
  store: "entity" | "assertion" | "rule";
  id: string;
  existed: boolean;
  previous: unknown | null;
}

async function writeArtifact(path: string, value: unknown): Promise<void> {
  const temporary = join(dirname(path), `.${path.split("/").at(-1) ?? "record"}.tmp`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function applyChangeSet(
  kb: KnowledgeBase,
  changeSet: ChangeSet,
  opts: { autoAccept?: boolean } = {},
): Promise<Result<ApplyResult>> {
  const allowed =
    changeSet.status === "accepted" ||
    (opts.autoAccept === true && ["proposed", "validated"].includes(changeSet.status));
  if (!allowed) return err("CONFLICT", `ChangeSet ${changeSet.id} is not accepted`);

  const base = join(kb.curationRoot, "changesets", changeSet.id);
  try {
    await readFile(`${base}.json`, "utf8");
    return {
      ok: true,
      value: { applied: false, alreadyApplied: true, skippedOntology: 0, warnings: [] },
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      return err(
        "CONFLICT",
        `Unable to read ChangeSet ${changeSet.id}: ${(error as Error).message}`,
      );
  }

  const validation = await validateChangeSet(kb, changeSet);
  if (!validation.ok) return err("VALIDATION_ERROR", validation.errors.join("; "));

  const entries: JournalEntry[] = [];
  const warnings = [...validation.warnings];
  const capture = async (store: JournalEntry["store"], op: string, id: string) => {
    const repo =
      store === "entity" ? kb.entities : store === "assertion" ? kb.assertions : kb.rules;
    const previous = await repo.load(id);
    entries.push({ op, store, id, existed: previous !== null, previous });
    return previous;
  };
  try {
    for (const change of changeSet.entityChanges) {
      if (change.op === "create" && change.entity) {
        await capture("entity", "create", change.entity.id);
        await kb.entities.save(change.entity);
      } else if (change.op === "update" && change.target && change.entity) {
        const previous = await capture("entity", "update", change.target);
        if (previous) {
          const current = previous as Entity;
          await kb.entities.save({ ...current, ...change.entity, id: current.id });
        }
      } else if (change.op === "merge" && change.target && change.entity) {
        const previous = await capture("entity", "merge", change.target);
        if (previous) await kb.entities.save({ ...change.entity, id: change.target });
        if (change.entityId && change.entityId !== change.target) {
          await capture("entity", "merge", change.entityId);
          await kb.entities.delete(change.entityId);
        }
      } else if (change.op === "split" && change.entity) {
        await capture("entity", "split", change.entity.id);
        await kb.entities.save(change.entity);
      } else if (change.op === "reclassify" && change.target && change.entity) {
        const previous = await capture("entity", "reclassify", change.target);
        if (previous) await kb.entities.save({ ...(previous as Entity), type: change.entity.type });
      }
    }
    for (const change of changeSet.assertionChanges) {
      if (change.op === "add" && change.assertion) {
        await capture("assertion", "add", change.assertion.id);
        await kb.assertions.save(change.assertion);
      } else if (change.assertionId) {
        const previous = await capture("assertion", change.op, change.assertionId);
        if (change.op === "remove") await kb.assertions.delete(change.assertionId);
        if (change.op === "supersede" && previous)
          await kb.assertions.save({ ...(previous as Assertion), status: "superseded" });
        if (change.op === "update_status" && previous && change.status)
          await kb.assertions.save({ ...(previous as Assertion), status: change.status });
      }
    }
    for (const change of changeSet.ruleChanges) {
      if (change.op === "add_rule" && change.rule) {
        await capture("rule", "add_rule", change.rule.id);
        await kb.rules.save(change.rule);
      } else if (change.op === "supersede_rule" && change.ruleId && change.rule) {
        const previous = await capture("rule", "supersede_rule", change.ruleId);
        if (previous)
          await kb.rules.save({
            ...(previous as Rule),
            status: "superseded",
            supersededBy: change.rule.id,
          });
        await capture("rule", "supersede_rule", change.rule.id);
        await kb.rules.save(change.rule);
      }
    }
    const skippedOntology = changeSet.ontologyChanges.length;
    if (skippedOntology > 0)
      warnings.push(
        "ontology changes not applied (ontology package is a stub until Phase 3 ontology)",
      );
    await writeArtifact(`${base}.json`, { ...changeSet, status: "applied" });
    await writeArtifact(`${base}.journal.json`, { changesetId: changeSet.id, entries });
    return { ok: true, value: { applied: true, alreadyApplied: false, skippedOntology, warnings } };
  } catch (error) {
    return err(
      "CONFLICT",
      `Unable to apply ChangeSet ${changeSet.id}: ${(error as Error).message}`,
    );
  }
}
