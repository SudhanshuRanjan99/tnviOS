import Typesense from "typesense";
import type { ConfigurationOptions } from "typesense/lib/Typesense/Configuration.js";

export interface TypesenseConnectionOptions {
  readonly apiKey: string;
  readonly host: string;
  readonly connectionTimeoutSeconds?: number;
  readonly numRetries?: number;
  readonly retryIntervalSeconds?: number;
}

export interface TypesenseHealth {
  readonly ok: boolean;
}

export interface TypesenseHealthClient {
  health: {
    retrieve(): Promise<TypesenseHealth>;
  };
}

export class InvalidTypesenseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTypesenseConfigurationError";
  }
}

export function createTypesenseClient(options: TypesenseConnectionOptions): Typesense.Client {
  return new Typesense.Client(createTypesenseConfiguration(options));
}

export function createTypesenseConfiguration(
  options: TypesenseConnectionOptions,
): ConfigurationOptions {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new InvalidTypesenseConfigurationError("Typesense API key is required.");

  const url = parseTypesenseHost(options.host);
  return {
    apiKey,
    nodes: [
      {
        host: url.hostname,
        port: resolvePort(url),
        protocol: url.protocol.slice(0, -1),
      },
    ],
    connectionTimeoutSeconds: positiveInteger(options.connectionTimeoutSeconds, 5),
    numRetries: nonNegativeInteger(options.numRetries, 3),
    retryIntervalSeconds: positiveInteger(options.retryIntervalSeconds, 1),
  };
}

export async function checkTypesenseHealth(
  client: TypesenseHealthClient,
): Promise<TypesenseHealth> {
  const health = await client.health.retrieve();
  if (!health.ok) throw new Error("Typesense health check reported an unhealthy service.");
  return health;
}

function parseTypesenseHost(host: string): URL {
  let url: URL;
  try {
    url = new URL(host);
  } catch {
    throw new InvalidTypesenseConfigurationError("Typesense host must be a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidTypesenseConfigurationError("Typesense host must use HTTP or HTTPS.");
  }
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new InvalidTypesenseConfigurationError(
      "Typesense host must not include credentials, a path, query parameters, or a fragment.",
    );
  }
  return url;
}

function resolvePort(url: URL): number {
  if (url.port) return Number(url.port);
  return url.protocol === "https:" ? 443 : 80;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < 1) {
    throw new InvalidTypesenseConfigurationError(
      "Typesense retry and timeout values must be positive.",
    );
  }
  return result;
}

function nonNegativeInteger(value: number | undefined, fallback: number): number {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < 0) {
    throw new InvalidTypesenseConfigurationError("Typesense retry count must not be negative.");
  }
  return result;
}
