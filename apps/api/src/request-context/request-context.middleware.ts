import { BadRequestException, Injectable, type NestMiddleware } from "@nestjs/common";
import {
  createRequestContext,
  InvalidRequestContextHeaderError,
  REQUEST_HEADER_NAMES,
  requestContextStore,
  type RequestHeaderValue,
  type RequestHeaders,
} from "@tnvios/request-context";
import { enrichActiveSpanWithRequestContext } from "@tnvios/telemetry/request";

interface RequestWithHeaders {
  readonly headers: Readonly<Record<string, RequestHeaderValue>>;
}

interface ResponseWithHeader {
  setHeader(name: string, value: string): void;
}

type NextFunction = (error?: unknown) => void;

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: RequestWithHeaders, response: ResponseWithHeader, next: NextFunction): void {
    try {
      const context = createRequestContext(request.headers as RequestHeaders);

      response.setHeader(REQUEST_HEADER_NAMES.correlationId, context.correlationId);
      enrichActiveSpanWithRequestContext(context);
      requestContextStore.run(context, next);
    } catch (error) {
      if (error instanceof InvalidRequestContextHeaderError) {
        next(
          new BadRequestException({
            code: "INVALID_REQUEST_CONTEXT",
            message: error.message,
          }),
        );
        return;
      }

      next(error);
    }
  }
}
