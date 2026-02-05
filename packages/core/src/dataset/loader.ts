import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ZodError } from "zod";
import {
  datasetSampleSchema,
  type DatasetSample,
  type DatasetConstraints,
  type DatasetMetadata,
} from "./schema.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Filter criteria for querying loaded samples */
export interface DatasetFilter {
  /** Filter by task type */
  task_type?: "send" | "swap";

  /** Filter by difficulty level */
  level?: "easy" | "medium" | "hard";

  /** Filter by chain id */
  chain_id?: number;

  /** Filter by sample ids */
  ids?: string[];
}

/** Per-line parse result — either a valid sample or a parse error */
export type ParseResult =
  | { ok: true; sample: DatasetSample }
  | { ok: false; line: number; raw: string; error: ZodError };

/** Summary statistics for a loaded dataset */
export interface DatasetStats {
  total: number;
  valid: number;
  invalid: number;
  byTaskType: Record<string, number>;
  byLevel: Record<string, number>;
  byChain: Record<number, number>;
  withExpectedOutput: number;
}

// ---------------------------------------------------------------------------
// DatasetLoader
// ---------------------------------------------------------------------------

export class DatasetLoader {
  /** Successfully parsed samples */
  private samples: DatasetSample[] = [];

  /** Parse errors captured during load */
  private errors: ParseResult[] = [];

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  /**
   * Load a JSONL file from disk.
   *
   * @param filePath — absolute or relative path to a `.jsonl` file
   * @param options.strict — if true, throw on the first invalid line (default: false)
   * @returns this (for chaining)
   */
  async loadFile(
    filePath: string,
    options: { strict?: boolean } = {}
  ): Promise<this> {
    const absolute = resolve(filePath);
    const content = await readFile(absolute, "utf-8");
    this.parseContent(content, options.strict ?? false);
    return this;
  }

  /**
   * Load samples from a raw JSONL string (useful for tests / in-memory data).
   *
   * @param content — JSONL text (one JSON object per line)
   * @param options.strict — if true, throw on the first invalid line
   * @returns this
   */
  loadString(
    content: string,
    options: { strict?: boolean } = {}
  ): this {
    this.parseContent(content, options.strict ?? false);
    return this;
  }

  /**
   * Load pre-constructed sample objects directly (bypasses file I/O).
   * Each object is still validated against the schema.
   */
  loadObjects(
    objects: unknown[],
    options: { strict?: boolean } = {}
  ): this {
    for (let i = 0; i < objects.length; i++) {
      const result = datasetSampleSchema.safeParse(objects[i]);
      if (result.success) {
        this.samples.push(result.data);
      } else {
        const err: ParseResult = {
          ok: false,
          line: i + 1,
          raw: JSON.stringify(objects[i]),
          error: result.error,
        };
        this.errors.push(err);
        if (options.strict) {
          throw new DatasetValidationError(
            `Validation failed at object index ${i}`,
            [err]
          );
        }
      }
    }
    return this;
  }

  // -----------------------------------------------------------------------
  // Querying
  // -----------------------------------------------------------------------

  /** Return all valid samples */
  all(): DatasetSample[] {
    return [...this.samples];
  }

  /** Return the count of loaded (valid) samples */
  get size(): number {
    return this.samples.length;
  }

  /** Look up a sample by id */
  getById(id: string): DatasetSample | undefined {
    return this.samples.find((s) => s.id === id);
  }

  /**
   * Filter samples by criteria. All provided fields are AND-combined.
   */
  filter(criteria: DatasetFilter): DatasetSample[] {
    let result = this.samples;

    if (criteria.task_type !== undefined) {
      result = result.filter(
        (s) => s.metadata.task_type === criteria.task_type
      );
    }
    if (criteria.level !== undefined) {
      result = result.filter((s) => s.metadata.level === criteria.level);
    }
    if (criteria.chain_id !== undefined) {
      result = result.filter(
        (s) => s.metadata.chain_id === criteria.chain_id
      );
    }
    if (criteria.ids !== undefined) {
      const idSet = new Set(criteria.ids);
      result = result.filter((s) => idSet.has(s.id));
    }

    return result;
  }

  /** Return only samples that include expected_output (ground truth) */
  withExpectedOutput(): DatasetSample[] {
    return this.samples.filter((s) => s.expected_output !== undefined);
  }

  // -----------------------------------------------------------------------
  // Statistics
  // -----------------------------------------------------------------------

  /** Compute summary statistics for the loaded dataset */
  stats(): DatasetStats {
    const byTaskType: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    const byChain: Record<number, number> = {};
    let withExpectedOutput = 0;

    for (const s of this.samples) {
      byTaskType[s.metadata.task_type] =
        (byTaskType[s.metadata.task_type] ?? 0) + 1;
      byLevel[s.metadata.level] = (byLevel[s.metadata.level] ?? 0) + 1;
      byChain[s.metadata.chain_id] =
        (byChain[s.metadata.chain_id] ?? 0) + 1;
      if (s.expected_output) withExpectedOutput++;
    }

    return {
      total: this.samples.length + this.errors.length,
      valid: this.samples.length,
      invalid: this.errors.length,
      byTaskType,
      byLevel,
      byChain,
      withExpectedOutput,
    };
  }

  // -----------------------------------------------------------------------
  // Error access
  // -----------------------------------------------------------------------

  /** Return all parse/validation errors encountered during load */
  getErrors(): ParseResult[] {
    return [...this.errors];
  }

  /** True if there were validation errors during load */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------

  /** Clear all loaded data and errors */
  clear(): this {
    this.samples = [];
    this.errors = [];
    return this;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private parseContent(content: string, strict: boolean): void {
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let parsed: unknown;

      try {
        parsed = JSON.parse(line);
      } catch {
        const err: ParseResult = {
          ok: false,
          line: i + 1,
          raw: line,
          error: new ZodError([
            {
              code: "custom",
              path: [],
              message: `Invalid JSON at line ${i + 1}`,
            },
          ]),
        };
        this.errors.push(err);
        if (strict) {
          throw new DatasetValidationError(
            `Invalid JSON at line ${i + 1}`,
            [err]
          );
        }
        continue;
      }

      const result = datasetSampleSchema.safeParse(parsed);
      if (result.success) {
        this.samples.push(result.data);
      } else {
        const err: ParseResult = {
          ok: false,
          line: i + 1,
          raw: line,
          error: result.error,
        };
        this.errors.push(err);
        if (strict) {
          throw new DatasetValidationError(
            `Validation failed at line ${i + 1}`,
            [err]
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class DatasetValidationError extends Error {
  constructor(
    message: string,
    public readonly parseErrors: ParseResult[]
  ) {
    super(message);
    this.name = "DatasetValidationError";
  }
}
