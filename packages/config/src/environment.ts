import { readFile } from "node:fs/promises";

import { parse } from "dotenv";
import { z } from "zod";

import { DEPLOYMENT_ENVIRONMENTS, NODE_ENVIRONMENTS } from "./constants.js";

const requiredString = z.string().trim().min(1, "is required");
const url = z.url("must be a valid URL");

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(NODE_ENVIRONMENTS).default("development"),
    TNVIOS_ENV: z.enum(DEPLOYMENT_ENVIRONMENTS),
    DATABASE_URL: url.refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "must use the PostgreSQL protocol",
    ),
    REDIS_URL: url.refine(
      (value) => value.startsWith("redis://") || value.startsWith("rediss://"),
      "must use the Redis protocol",
    ),
    KEYCLOAK_ISSUER_URL: url,
    KEYCLOAK_CLIENT_ID: requiredString,
    KEYCLOAK_CLIENT_SECRET: requiredString,
    JWT_AUDIENCE: requiredString,
    S3_ENDPOINT: url,
    S3_ACCESS_KEY: requiredString,
    S3_SECRET_KEY: requiredString,
    S3_BUCKET: requiredString,
    TYPESENSE_HOST: url,
    TYPESENSE_API_KEY: requiredString,
    RESEND_API_KEY: requiredString,
    OTEL_EXPORTER_OTLP_ENDPOINT: url,
  })
  .readonly();

export type Environment = z.infer<typeof environmentSchema>;

export interface EnvironmentValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class EnvironmentValidationError extends Error {
  readonly issues: readonly EnvironmentValidationIssue[];

  constructor(issues: readonly EnvironmentValidationIssue[]) {
    super("Environment validation failed");
    this.name = "EnvironmentValidationError";
    this.issues = issues;
  }
}

export function validateEnvironment(
  input: NodeJS.ProcessEnv | Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(input);

  if (!result.success) {
    throw new EnvironmentValidationError(
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return result.data;
}

export async function loadEnvironmentFile(filePath: string): Promise<Environment> {
  const contents = await readFile(filePath, "utf8");
  return validateEnvironment(parse(contents));
}
