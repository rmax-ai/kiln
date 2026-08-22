import { EntityTypeSchema, PredicateSchema, type Rule, slugify } from "@kiln/domain";
import type { KnowledgeBase } from "@kiln/knowledge";

export interface SearchHit {
  id: string;
  label: string;
  kind: string;
  snippet: string;
}

const firstMatch = (values: string[], query: string): string | undefined =>
  values.find((value) => value.toLowerCase().includes(query));

export async function searchKnowledge(
  kb: KnowledgeBase,
  query: string,
  limit = 10,
): Promise<SearchHit[]> {
  const needle = query.toLowerCase();
  const [entities, assertions] = await Promise.all([kb.entities.list(), kb.assertions.list()]);
  const entityHits = entities.flatMap((entity) => {
    const matching = firstMatch(
      [entity.label, ...entity.aliases, entity.description ?? ""],
      needle,
    );
    return matching
      ? [{ id: entity.id, label: entity.label, kind: entity.type, snippet: matching.slice(0, 120) }]
      : [];
  });
  const assertionHits = assertions.flatMap((assertion) => {
    const object =
      "type" in assertion.object ? String(assertion.object.value) : assertion.object.id;
    const matching = firstMatch([assertion.subject.id, object], needle);
    return matching
      ? [
          {
            id: assertion.id,
            label: assertion.id,
            kind: "assertion",
            snippet: matching.slice(0, 120),
          },
        ]
      : [];
  });
  return [...entityHits, ...assertionHits]
    .sort((left, right) => left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id))
    .slice(0, limit);
}

export async function findAliases(
  kb: KnowledgeBase,
  name: string,
): Promise<{ entityId: string; label: string; alias: string }[]> {
  const needle = slugify(name);
  return (await kb.entities.list())
    .flatMap((entity) =>
      entity.aliases
        .filter((alias) => alias.includes(needle))
        .map((alias) => ({ entityId: entity.id, label: entity.label, alias })),
    )
    .sort(
      (left, right) =>
        left.entityId.localeCompare(right.entityId) || left.alias.localeCompare(right.alias),
    );
}

export async function findSimilarEntities(
  kb: KnowledgeBase,
  name: string,
  limit = 5,
): Promise<{ id: string; label: string; aliases: string[] }[]> {
  const slug = slugify(name);
  const fragments = slug.split("-").filter(Boolean);
  return (await kb.entities.list())
    .map((entity) => {
      const labelSlug = slugify(entity.label);
      const score =
        (entity.aliases.some((alias) => alias === slug) ? 3 : 0) +
        (labelSlug.startsWith(slug) ? 2 : 0) +
        (fragments.some((fragment) => labelSlug.includes(fragment)) ? 1 : 0);
      return { ...entity, score };
    })
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit)
    .map(({ id, label, aliases }) => ({ id, label, aliases }));
}

export async function getCurationRules(kb: KnowledgeBase): Promise<Rule[]> {
  return (await kb.rules.list())
    .filter((rule) => rule.status === "active")
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function getOntology(): { entityTypes: string[]; predicates: string[] } {
  return { entityTypes: [...EntityTypeSchema.options], predicates: [...PredicateSchema.options] };
}
