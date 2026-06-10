import { describe, expect, it } from "vitest";

import { EnvironmentValidationError, validateEnvironment } from "./environment.js";

const validEnvironment = {
  NODE_ENV: "development",
  TNVIOS_ENV: "local",
  DATABASE_URL: "postgresql://tnvios:tnvios@localhost:5432/tnvios",
  REDIS_URL: "redis://localhost:6379",
  KEYCLOAK_ISSUER_URL: "http://localhost:8080/realms/tnvios",
  KEYCLOAK_CLIENT_ID: "tnvios-api",
  KEYCLOAK_CLIENT_SECRET: "local-development-secret",
  KEYCLOAK_WEBHOOK_SECRET: "local-webhook-secret",
  JWT_AUDIENCE: "tnvios-api",
  S3_ENDPOINT: "http://localhost:9000",
  S3_ACCESS_KEY: "tnvios",
  S3_SECRET_KEY: "local-development-secret",
  S3_BUCKET: "tnvios",
  TYPESENSE_HOST: "http://localhost:8108",
  TYPESENSE_API_KEY: "local-development-key",
  RESEND_API_KEY: "local-development-key",
  NOTIFICATION_EMAIL_FROM: "Tnvios <notifications@example.com>",
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
} as const;

describe("validateEnvironment", () => {
  it("returns a typed, validated environment", () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject(validEnvironment);
  });

  it("reports missing variables without exposing values", () => {
    try {
      validateEnvironment({ ...validEnvironment, S3_SECRET_KEY: "" });
      expect.fail("Expected environment validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect((error as EnvironmentValidationError).issues).toEqual([
        { path: "S3_SECRET_KEY", message: "is required" },
      ]);
      expect(String(error)).not.toContain(validEnvironment.S3_SECRET_KEY);
    }
  });

  it("rejects invalid service protocols", () => {
    try {
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: "https://localhost:5432/tnvios",
        REDIS_URL: "https://localhost:6379",
      });
      expect.fail("Expected environment validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect((error as EnvironmentValidationError).issues).toEqual([
        { path: "DATABASE_URL", message: "must use the PostgreSQL protocol" },
        { path: "REDIS_URL", message: "must use the Redis protocol" },
      ]);
    }
  });
});
