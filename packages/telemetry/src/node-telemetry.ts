import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";

export interface NodeTelemetryOptions {
  readonly deploymentEnvironment: string;
  readonly otlpEndpoint: string;
  readonly serviceName: string;
  readonly serviceVersion?: string;
}

export interface TelemetrySdk {
  shutdown(): Promise<void>;
  start(): void;
}

export class NodeTelemetry {
  readonly #sdk: TelemetrySdk;
  #started = false;
  #stopped = false;

  constructor(sdk: TelemetrySdk) {
    this.#sdk = sdk;
  }

  start(): void {
    if (this.#started) {
      return;
    }

    this.#sdk.start();
    this.#started = true;
  }

  async shutdown(): Promise<void> {
    if (!this.#started || this.#stopped) {
      return;
    }

    this.#stopped = true;
    await this.#sdk.shutdown();
  }
}

export function createNodeTelemetry(options: NodeTelemetryOptions): NodeTelemetry {
  const resource = resourceFromAttributes({
    "deployment.environment.name": options.deploymentEnvironment,
    "service.name": options.serviceName,
    ...(options.serviceVersion === undefined ? {} : { "service.version": options.serviceVersion }),
  });
  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
      }),
    ],
    logRecordProcessors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: createOtlpSignalUrl(options.otlpEndpoint, "logs"),
        }),
      ),
    ],
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: createOtlpSignalUrl(options.otlpEndpoint, "metrics"),
      }),
    }),
    resource,
    traceExporter: new OTLPTraceExporter({
      url: createOtlpSignalUrl(options.otlpEndpoint, "traces"),
    }),
  });

  return new NodeTelemetry(sdk);
}

export function createOtlpSignalUrl(
  endpoint: string,
  signal: "logs" | "metrics" | "traces",
): string {
  const url = new URL(endpoint);

  url.pathname = `${url.pathname.replace(/\/+$/, "")}/v1/${signal}`;

  return url.toString();
}

export function startNodeTelemetry(options: NodeTelemetryOptions): NodeTelemetry {
  const telemetry = createNodeTelemetry(options);
  telemetry.start();

  return telemetry;
}
