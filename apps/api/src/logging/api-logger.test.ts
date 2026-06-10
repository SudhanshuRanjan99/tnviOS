import { StructuredLogger, type LogSink } from "@tnvios/logging";
import { describe, expect, it } from "vitest";

import { NestStructuredLogger } from "./api-logger.js";

class MemoryLogSink implements LogSink {
  readonly lines: string[] = [];

  write(line: string): void {
    this.lines.push(line);
  }
}

describe("NestStructuredLogger", () => {
  it("maps Nest messages to structured records", () => {
    const sink = new MemoryLogSink();
    const logger = new StructuredLogger({
      environment: "test",
      service: "api",
      sink,
    });

    new NestStructuredLogger(logger).warn("Route warning", "RouterExplorer");

    expect(JSON.parse(sink.lines[0] ?? "")).toMatchObject({
      attributes: {
        nestContext: "RouterExplorer",
      },
      level: "warn",
      message: "Route warning",
      service: "api",
    });
  });
});
