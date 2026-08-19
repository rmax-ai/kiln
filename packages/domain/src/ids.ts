import { KilnError } from "./errors.js";

export const ID_KINDS = [
  "source",
  "concept",
  "problem",
  "pattern",
  "technique",
  "system",
  "tool",
  "claim",
  "person",
  "organization",
  "video",
  "paper",
  "article",
  "repository",
  "documentation",
  "podcast",
  "note",
  "assertion",
  "evidence",
  "resource",
  "decision",
  "rule",
  "proposal",
  "changeset",
  "enrichment",
] as const;

export type IdKind = (typeof ID_KINDS)[number];
export type RecordId<K extends IdKind = IdKind> = `${K}:${string}`;

const ID_PATTERN = /^([a-z]+):([a-z0-9][a-z0-9-]*)$/;
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function slugify(input: string): string {
  return input
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function parseId(id: string): { kind: IdKind; slug: string } | null {
  const match = ID_PATTERN.exec(id);
  if (!match) return null;
  const kind = match[1];
  const slug = match[2];
  if (!kind || !slug || !ID_KINDS.includes(kind as IdKind)) return null;
  return { kind: kind as IdKind, slug };
}

export function makeId<K extends IdKind>(kind: K, slug: string): RecordId<K> {
  if (slug !== slugify(slug) || slug.length === 0) {
    throw new KilnError("INVALID_ID", "ID slug must be normalized", { kind, slug });
  }
  return `${kind}:${slug}`;
}

export function isRecordId(id: string, kind?: IdKind): boolean {
  const parsed = parseId(id);
  return parsed !== null && (kind === undefined || parsed.kind === kind);
}

export function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function assertionId(subject: string, predicate: string, object: string): string {
  const prefix = "assertion:";
  const subjectSlug = slugify(subject);
  const predicateSlug = slugify(predicate);
  const objectSlug = slugify(object);
  const fixed = `${prefix}${subjectSlug}-${predicateSlug}-`;
  const candidate = `${fixed}${objectSlug}`;
  if (candidate.length <= 200) return candidate;

  const suffix = `-${fnv1a32(object).slice(-8)}`;
  const available = Math.max(0, 200 - fixed.length - suffix.length);
  return `${fixed}${objectSlug.slice(0, available)}${suffix}`;
}

export function evidenceId(sourceId: string, locatorKey: string, excerptKey: string): string {
  return `evidence:${slugify(sourceId)}-${fnv1a32(`${locatorKey}|${excerptKey}`).slice(0, 8)}`;
}

let lastTimestamp = -1;
let lastRandom = 0n;

function encodeBase32(value: bigint, length: number): string {
  let remaining = value;
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output = CROCKFORD_BASE32.charAt(Number(remaining & 31n)) + output;
    remaining >>= 5n;
  }
  return output;
}

function random80BitValue(): bigint {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

export function makeUlid(): string {
  const timestamp = Math.trunc(performance.timeOrigin + performance.now());
  if (timestamp > lastTimestamp) {
    lastTimestamp = timestamp;
    lastRandom = random80BitValue();
  } else {
    lastRandom = (lastRandom + 1n) & ((1n << 80n) - 1n);
  }
  return `${encodeBase32(BigInt(lastTimestamp), 10)}${encodeBase32(lastRandom, 16)}`;
}

export const isUlid = (value: string): boolean => ULID_PATTERN.test(value);
