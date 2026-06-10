import { RequestMethod, ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { NestStructuredLogger } from "./logging/api-logger.js";

export const API_GLOBAL_PREFIX = "api/v1";
export const DEFAULT_API_HOST = "0.0.0.0";
export const DEFAULT_API_PORT = 4000;

export interface ApiRuntimeOptions {
  readonly host: string;
  readonly port: number;
}

export class InvalidApiPortError extends Error {
  constructor() {
    super("API_PORT must be an integer between 1 and 65535.");
    this.name = "InvalidApiPortError";
  }
}

export function getApiRuntimeOptions(environment: NodeJS.ProcessEnv): ApiRuntimeOptions {
  return {
    host: environment.API_HOST?.trim() || DEFAULT_API_HOST,
    port: parseApiPort(environment.API_PORT),
  };
}

export function parseApiPort(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) {
    return DEFAULT_API_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new InvalidApiPortError();
  }

  return port;
}

export function configureApplication(application: INestApplication): void {
  application.setGlobalPrefix(API_GLOBAL_PREFIX, {
    exclude: [
      {
        method: RequestMethod.POST,
        path: "internal/v1/identity/keycloak/events",
      },
      {
        method: RequestMethod.POST,
        path: "internal/v1/events/outbox/process",
      },
      {
        method: RequestMethod.POST,
        path: "internal/v1/notifications",
      },
    ],
  });
  application.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  application.enableShutdownHooks();
}

export async function createApplication(): Promise<INestApplication> {
  const application = await NestFactory.create(AppModule, {
    abortOnError: true,
    logger: new NestStructuredLogger(),
    rawBody: true,
  });

  configureApplication(application);

  return application;
}
