import { startNodeTelemetry } from "@tnvios/telemetry/node";

const telemetry = startNodeTelemetry({
  deploymentEnvironment: process.env.TNVIOS_ENV ?? process.env.NODE_ENV ?? "unknown",
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318",
  serviceName: "api",
  serviceVersion: "0.0.0",
});

function shutdownTelemetry(): void {
  void telemetry.shutdown().catch(() => undefined);
}

process.once("SIGINT", shutdownTelemetry);
process.once("SIGTERM", shutdownTelemetry);
