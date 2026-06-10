export const APPLICATION_NAME = "Tnvios";

export const DEPLOYMENT_ENVIRONMENTS = [
  "local",
  "development",
  "test",
  "staging",
  "production",
] as const;

export const NODE_ENVIRONMENTS = ["development", "test", "production"] as const;

export const REQUIRED_ENVIRONMENT_VARIABLES = [
  "DATABASE_URL",
  "REDIS_URL",
  "KEYCLOAK_ISSUER_URL",
  "KEYCLOAK_CLIENT_ID",
  "KEYCLOAK_CLIENT_SECRET",
  "KEYCLOAK_WEBHOOK_SECRET",
  "JWT_AUDIENCE",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "S3_BUCKET",
  "TYPESENSE_HOST",
  "TYPESENSE_API_KEY",
  "RESEND_API_KEY",
  "NOTIFICATION_EMAIL_FROM",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
] as const;

export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];
export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];
export type RequiredEnvironmentVariable = (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number];
