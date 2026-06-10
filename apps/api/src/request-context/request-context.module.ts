import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";

import { RequestLoggingMiddleware } from "../logging/request-logging.middleware.js";
import { RequestContextMiddleware } from "./request-context.middleware.js";

@Module({})
export class RequestContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware, RequestLoggingMiddleware).forRoutes("*");
  }
}
