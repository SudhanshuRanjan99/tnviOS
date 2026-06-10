import { createRequestContext, requestContextStore } from "@tnvios/request-context";
import { describe, expect, it } from "vitest";

import { CompositeLogSink, StructuredLogger, type LogSink } from "./structured-logger.js";

class MemoryLogSink implements LogSink {
  readonly lines: string[] = [];

  write(line: string): void {
    this.lines.push(line);
  }
}

function createLogger(sink: LogSink): StructuredLogger {
  return new StructuredLogger({
    environment: "test",
    now: () => new Date("2026-06-10T00:00:00.000Z"),
    service: "test-service",
    sink,
  });
}

describe("StructuredLogger", () => {
  it("writes a JSON log record with stable fields", () => {
    const sink = new MemoryLogSink();

    createLogger(sink).info("ready", { port: 4000 });

    expect(JSON.parse(sink.lines[0] ?? "")).toEqual({
      attributes: { port: 4000 },
      environment: "test",
      level: "info",
      message: "ready",
      service: "test-service",
      timestamp: "2026-06-10T00:00:00.000Z",
    });
  });

  it("adds the active request context", () => {
    const sink = new MemoryLogSink();
    const context = createRequestContext({});

    requestContextStore.run(context, () => {
      createLogger(sink).info("request event");
    });

    expect(JSON.parse(sink.lines[0] ?? "")).toMatchObject({
      context: {
        correlationId: context.correlationId,
      },
    });
  });

  it("redacts sensitive attribute keys recursively", () => {
    const sink = new MemoryLogSink();

    createLogger(sink).info("credentials received", {
      authorization: "Bearer secret",
      nested: {
        DATABASE_URL: "postgresql://secret",
        password: "secret",
      },
    });

    expect(JSON.parse(sink.lines[0] ?? "")).toMatchObject({
      attributes: {
        authorization: "[REDACTED]",
        nested: {
          DATABASE_URL: "[REDACTED]",
          password: "[REDACTED]",
        },
      },
    });
  });

  it("serializes errors and child bindings", () => {
    const sink = new MemoryLogSink();
    const logger = createLogger(sink).child({ component: "worker" });

    logger.error("work failed", new TypeError("invalid work"), { jobId: "job-1" });

    expect(JSON.parse(sink.lines[0] ?? "")).toMatchObject({
      attributes: {
        component: "worker",
        jobId: "job-1",
      },
      error: {
        message: "invalid work",
        name: "TypeError",
      },
      level: "error",
    });
  });

  it("does not interrupt application work when the sink fails", () => {
    const logger = createLogger({
      write() {
        throw new Error("sink unavailable");
      },
    });

    expect(() => logger.info("still running")).not.toThrow();
  });

  it("delivers logs to every available composite sink", () => {
    const sink = new MemoryLogSink();
    const composite = new CompositeLogSink([
      {
        write() {
          throw new Error("sink unavailable");
        },
      },
      sink,
    ]);

    createLogger(composite).info("delivered");

    expect(sink.lines).toHaveLength(1);
  });
});
