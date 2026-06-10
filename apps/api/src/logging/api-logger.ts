import type { LoggerService } from "@nestjs/common";
import {
  CompositeLogSink,
  StandardOutputLogSink,
  StructuredLogger,
  type LogAttributes,
} from "@tnvios/logging";
import { OpenTelemetryLogSink } from "@tnvios/telemetry/logging";

export function createApiLogger(environment: NodeJS.ProcessEnv = process.env): StructuredLogger {
  return new StructuredLogger({
    environment: environment.TNVIOS_ENV ?? environment.NODE_ENV ?? "unknown",
    service: "api",
    sink: new CompositeLogSink([new StandardOutputLogSink(), new OpenTelemetryLogSink("api")]),
  });
}

export const apiLogger = createApiLogger();

export class NestStructuredLogger implements LoggerService {
  constructor(private readonly logger: StructuredLogger = apiLogger) {}

  debug(message: unknown, ...optionalParameters: unknown[]): void {
    this.logger.debug(formatMessage(message), createNestAttributes(optionalParameters));
  }

  error(message: unknown, ...optionalParameters: unknown[]): void {
    const error = optionalParameters.find((parameter) => parameter instanceof Error);
    this.logger.error(formatMessage(message), error, createNestAttributes(optionalParameters));
  }

  fatal(message: unknown, ...optionalParameters: unknown[]): void {
    const error = optionalParameters.find((parameter) => parameter instanceof Error);
    this.logger.fatal(formatMessage(message), error, createNestAttributes(optionalParameters));
  }

  log(message: unknown, ...optionalParameters: unknown[]): void {
    this.logger.info(formatMessage(message), createNestAttributes(optionalParameters));
  }

  verbose(message: unknown, ...optionalParameters: unknown[]): void {
    this.logger.debug(formatMessage(message), createNestAttributes(optionalParameters));
  }

  warn(message: unknown, ...optionalParameters: unknown[]): void {
    this.logger.warn(formatMessage(message), createNestAttributes(optionalParameters));
  }
}

function createNestAttributes(optionalParameters: readonly unknown[]): LogAttributes {
  return {
    nestContext: findLastString(optionalParameters),
    optionalParameters,
  };
}

function findLastString(values: readonly unknown[]): string | undefined {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];

    if (typeof value === "string") {
      return value;
    }
  }

  return undefined;
}

function formatMessage(message: unknown): string {
  return typeof message === "string" ? message : "NestJS framework event";
}
