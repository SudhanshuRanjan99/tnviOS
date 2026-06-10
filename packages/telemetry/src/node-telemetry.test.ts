import { describe, expect, it, vi } from "vitest";

import { createOtlpSignalUrl, NodeTelemetry, type TelemetrySdk } from "./node-telemetry.js";

describe("NodeTelemetry", () => {
  it("starts and shuts down the SDK once", async () => {
    const sdk: TelemetrySdk = {
      shutdown: vi.fn(async () => undefined),
      start: vi.fn(),
    };
    const telemetry = new NodeTelemetry(sdk);

    telemetry.start();
    telemetry.start();
    await telemetry.shutdown();
    await telemetry.shutdown();

    expect(sdk.start).toHaveBeenCalledTimes(1);
    expect(sdk.shutdown).toHaveBeenCalledTimes(1);
  });

  it("does not shut down an SDK that was not started", async () => {
    const sdk: TelemetrySdk = {
      shutdown: vi.fn(async () => undefined),
      start: vi.fn(),
    };

    await new NodeTelemetry(sdk).shutdown();

    expect(sdk.shutdown).not.toHaveBeenCalled();
  });
});

describe("createOtlpSignalUrl", () => {
  it("creates signal-specific OTLP HTTP endpoints", () => {
    expect(createOtlpSignalUrl("http://localhost:4318", "traces")).toBe(
      "http://localhost:4318/v1/traces",
    );
    expect(createOtlpSignalUrl("https://collector.example.com/otlp/", "metrics")).toBe(
      "https://collector.example.com/otlp/v1/metrics",
    );
    expect(createOtlpSignalUrl("http://localhost:4318", "logs")).toBe(
      "http://localhost:4318/v1/logs",
    );
  });
});
