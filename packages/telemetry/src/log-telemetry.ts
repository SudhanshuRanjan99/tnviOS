import { logs } from "@opentelemetry/api-logs";

export class OpenTelemetryLogSink {
  readonly #logger;

  constructor(name: string) {
    this.#logger = logs.getLogger(name);
  }

  write(line: string): void {
    this.#logger.emit({
      body: line,
    });
  }
}
