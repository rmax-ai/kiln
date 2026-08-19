export type KilnErrorCode =
  | "INVALID_ID"
  | "SCHEMA_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "REFERENCE_ERROR"
  | "IMMUTABLE"
  | "PRECEDENCE_VIOLATION";

export class KilnError extends Error {
  readonly code: KilnErrorCode;
  readonly details?: unknown;

  constructor(code: KilnErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "KilnError";
    this.code = code;
    this.details = details;
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: KilnError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err(code: KilnErrorCode, message: string, details?: unknown): Result<never> {
  return { ok: false, error: new KilnError(code, message, details) };
}
