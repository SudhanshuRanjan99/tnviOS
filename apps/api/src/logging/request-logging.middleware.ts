import { Injectable, type NestMiddleware } from "@nestjs/common";
import { recordHttpServerRequest } from "@tnvios/telemetry/request";

import { apiLogger } from "./api-logger.js";

interface RequestMetadata {
  readonly method?: string;
  readonly originalUrl?: string;
  readonly url?: string;
}

interface ResponseWithEvents {
  readonly statusCode: number;
  once(event: "finish", listener: () => void): this;
}

type NextFunction = (error?: unknown) => void;

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(request: RequestMetadata, response: ResponseWithEvents, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();

    response.once("finish", () => {
      const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
      const durationMs = Number(elapsedNanoseconds) / 1_000_000;

      apiLogger.info("HTTP request completed", {
        durationMs,
        method: request.method,
        path: getRequestPath(request),
        statusCode: response.statusCode,
      });
      recordHttpServerRequest({
        durationMs,
        method: request.method,
        statusCode: response.statusCode,
      });
    });

    next();
  }
}

function getRequestPath(request: RequestMetadata): string {
  return (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";
}
