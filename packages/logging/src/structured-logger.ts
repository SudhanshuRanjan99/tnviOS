import { requestContextStore, type RequestContext } from "@tnvios/request-context";

export type LogAttributes = Readonly<Record<string, unknown>>;
export type LogLevel = "debug" | "error" | "fatal" | "info" | "warn";

export interface LogSink {
  write(line: string): void;
}

export interface StructuredLoggerOptions {
  readonly bindings?: LogAttributes;
  readonly environment: string;
  readonly now?: () => Date;
  readonly service: string;
  readonly sink?: LogSink;
}

export class StandardOutputLogSink implements LogSink {
  write(line: string): void {
    process.stdout.write(`${line}\n`);
  }
}

export class CompositeLogSink implements LogSink {
  constructor(private readonly sinks: readonly LogSink[]) {}

  write(line: string): void {
    for (const sink of this.sinks) {
      try {
        sink.write(line);
      } catch {
        // One unavailable destination must not prevent delivery to the others.
      }
    }
  }
}

export class StructuredLogger {
  readonly #bindings: LogAttributes;
  readonly #environment: string;
  readonly #now: () => Date;
  readonly #service: string;
  readonly #sink: LogSink;

  constructor(options: StructuredLoggerOptions) {
    this.#bindings = options.bindings ?? {};
    this.#environment = options.environment;
    this.#now = options.now ?? (() => new Date());
    this.#service = options.service;
    this.#sink = options.sink ?? new StandardOutputLogSink();
  }

  child(bindings: LogAttributes): StructuredLogger {
    return new StructuredLogger({
      bindings: { ...this.#bindings, ...bindings },
      environment: this.#environment,
      now: this.#now,
      service: this.#service,
      sink: this.#sink,
    });
  }

  debug(message: string, attributes?: LogAttributes): void {
    this.#write("debug", message, attributes);
  }

  error(message: string, error?: unknown, attributes?: LogAttributes): void {
    this.#write("error", message, attributes, error);
  }

  fatal(message: string, error?: unknown, attributes?: LogAttributes): void {
    this.#write("fatal", message, attributes, error);
  }

  info(message: string, attributes?: LogAttributes): void {
    this.#write("info", message, attributes);
  }

  warn(message: string, attributes?: LogAttributes): void {
    this.#write("warn", message, attributes);
  }

  #write(level: LogLevel, message: string, attributes?: LogAttributes, error?: unknown): void {
    try {
      const context = requestContextStore.get();
      const record = {
        attributes: sanitize({ ...this.#bindings, ...attributes }),
        context: context === undefined ? undefined : createLogContext(context),
        environment: this.#environment,
        error: error === undefined ? undefined : sanitizeError(error),
        level,
        message,
        service: this.#service,
        timestamp: this.#now().toISOString(),
      };

      this.#sink.write(JSON.stringify(record));
    } catch {
      // Logging must never interrupt application work.
    }
  }
}

const SENSITIVE_KEY_PARTS = [
  "apikey",
  "authorization",
  "clientsecret",
  "cookie",
  "databaseurl",
  "password",
  "refreshtoken",
  "redisurl",
  "secret",
  "setcookie",
  "token",
] as const;

function createLogContext(context: RequestContext): Record<string, string> {
  return Object.fromEntries(
    Object.entries(context).filter((entry): entry is [string, string] => entry[1] !== null),
  );
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");

  return SENSITIVE_KEY_PARTS.some((part) => normalizedKey.includes(part));
}

function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return typeof value === "number" && !Number.isFinite(value) ? String(value) : value;
  }

  if (typeof value === "bigint" || typeof value === "symbol" || typeof value === "function") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return sanitizeError(value);
  }

  if (typeof value !== "object") {
    return undefined;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? "[REDACTED]" : sanitize(item, seen),
    ]),
  );
}

function sanitizeError(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return sanitize(error);
  }

  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
}
