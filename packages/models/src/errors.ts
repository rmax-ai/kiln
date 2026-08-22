export class StructuredOutputFailure extends Error {
  readonly task: string;
  readonly raw: string;

  constructor(task: string, raw: string, cause?: unknown) {
    const preview = raw.length > 200 ? `${raw.slice(0, 199)}…` : raw;
    super(`Structured output failure for task ${task}: ${preview}`, { cause });
    this.name = "StructuredOutputFailure";
    this.task = task;
    this.raw = raw;
  }
}
