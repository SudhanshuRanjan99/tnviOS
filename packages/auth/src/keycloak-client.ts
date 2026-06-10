import type { Environment } from "@tnvios/config";

export interface KeycloakConfiguration {
  readonly audience: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly discoveryUrl: string;
  readonly issuerUrl: string;
}

export interface OpenIdConfiguration {
  readonly authorization_endpoint: string;
  readonly issuer: string;
  readonly jwks_uri: string;
  readonly token_endpoint: string;
  readonly userinfo_endpoint?: string;
}

export interface ClientCredentialsToken {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly scope?: string;
  readonly tokenType: string;
}

export interface KeycloakClientOptions {
  readonly fetch?: typeof fetch;
}

export class KeycloakIntegrationError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "KeycloakIntegrationError";
    this.status = status;
  }
}

export function createKeycloakConfiguration(
  environment: Pick<
    Environment,
    "JWT_AUDIENCE" | "KEYCLOAK_CLIENT_ID" | "KEYCLOAK_CLIENT_SECRET" | "KEYCLOAK_ISSUER_URL"
  >,
): KeycloakConfiguration {
  const issuerUrl = environment.KEYCLOAK_ISSUER_URL.replace(/\/+$/, "");

  return {
    audience: environment.JWT_AUDIENCE,
    clientId: environment.KEYCLOAK_CLIENT_ID,
    clientSecret: environment.KEYCLOAK_CLIENT_SECRET,
    discoveryUrl: `${issuerUrl}/.well-known/openid-configuration`,
    issuerUrl,
  };
}

export class KeycloakClient {
  readonly #configuration: KeycloakConfiguration;
  readonly #fetch: typeof fetch;
  #discoveryRequest?: Promise<OpenIdConfiguration>;

  constructor(configuration: KeycloakConfiguration, options: KeycloakClientOptions = {}) {
    this.#configuration = configuration;
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  get configuration(): KeycloakConfiguration {
    return this.#configuration;
  }

  discover(): Promise<OpenIdConfiguration> {
    this.#discoveryRequest ??= this.#loadOpenIdConfiguration();
    return this.#discoveryRequest;
  }

  async requestClientCredentialsToken(
    scopes: readonly string[] = [],
  ): Promise<ClientCredentialsToken> {
    const discovery = await this.discover();
    const body = new URLSearchParams({ grant_type: "client_credentials" });

    if (scopes.length > 0) {
      body.set("scope", scopes.join(" "));
    }

    const response = await this.#fetch(discovery.token_endpoint, {
      body,
      headers: {
        authorization: `Basic ${Buffer.from(
          `${this.#configuration.clientId}:${this.#configuration.clientSecret}`,
        ).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new KeycloakIntegrationError(
        `Keycloak token request failed with HTTP ${response.status}.`,
        response.status,
      );
    }

    return parseClientCredentialsToken(await response.json());
  }

  async #loadOpenIdConfiguration(): Promise<OpenIdConfiguration> {
    const response = await this.#fetch(this.#configuration.discoveryUrl, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      this.#discoveryRequest = undefined;
      throw new KeycloakIntegrationError(
        `Keycloak discovery failed with HTTP ${response.status}.`,
        response.status,
      );
    }

    const configuration = parseOpenIdConfiguration(await response.json());

    if (configuration.issuer.replace(/\/+$/, "") !== this.#configuration.issuerUrl) {
      this.#discoveryRequest = undefined;
      throw new KeycloakIntegrationError("Keycloak discovery returned an unexpected issuer.");
    }

    return configuration;
  }
}

function parseOpenIdConfiguration(value: unknown): OpenIdConfiguration {
  if (!isRecord(value)) {
    throw new KeycloakIntegrationError("Keycloak discovery returned an invalid document.");
  }

  const issuer = readUrl(value, "issuer");
  const authorizationEndpoint = readUrl(value, "authorization_endpoint");
  const jwksUri = readUrl(value, "jwks_uri");
  const tokenEndpoint = readUrl(value, "token_endpoint");
  const userinfoEndpoint = readOptionalUrl(value, "userinfo_endpoint");

  return {
    authorization_endpoint: authorizationEndpoint,
    issuer,
    jwks_uri: jwksUri,
    token_endpoint: tokenEndpoint,
    ...(userinfoEndpoint === undefined ? {} : { userinfo_endpoint: userinfoEndpoint }),
  };
}

function parseClientCredentialsToken(value: unknown): ClientCredentialsToken {
  if (
    !isRecord(value) ||
    typeof value.access_token !== "string" ||
    typeof value.expires_in !== "number" ||
    typeof value.token_type !== "string"
  ) {
    throw new KeycloakIntegrationError("Keycloak returned an invalid token response.");
  }

  return {
    accessToken: value.access_token,
    expiresIn: value.expires_in,
    ...(typeof value.scope === "string" ? { scope: value.scope } : {}),
    tokenType: value.token_type,
  };
}

function readUrl(value: Record<string, unknown>, key: string): string {
  const result = readOptionalUrl(value, key);

  if (result === undefined) {
    throw new KeycloakIntegrationError(`Keycloak discovery is missing ${key}.`);
  }

  return result;
}

function readOptionalUrl(value: Record<string, unknown>, key: string): string | undefined {
  const result = value[key];

  if (result === undefined) {
    return undefined;
  }

  if (typeof result !== "string" || !URL.canParse(result)) {
    throw new KeycloakIntegrationError(`Keycloak discovery contains an invalid ${key}.`);
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
