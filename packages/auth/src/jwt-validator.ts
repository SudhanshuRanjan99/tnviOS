import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";

import type { KeycloakClient } from "./keycloak-client.js";

export interface AuthenticatedPrincipal {
  readonly email?: string;
  readonly emailVerified?: boolean;
  readonly keycloakUserId: string;
  readonly preferredUsername?: string;
}

export interface KeycloakJwtValidatorOptions {
  readonly verificationKey?: JWTVerifyGetKey;
}

export class JwtValidationError extends Error {
  constructor() {
    super("Access token is invalid.");
    this.name = "JwtValidationError";
  }
}

export class KeycloakJwtValidator {
  readonly #keycloakClient: Pick<KeycloakClient, "configuration" | "discover">;
  readonly #verificationKey?: JWTVerifyGetKey;
  #remoteJwks?: JWTVerifyGetKey;

  constructor(
    keycloakClient: Pick<KeycloakClient, "configuration" | "discover">,
    options: KeycloakJwtValidatorOptions = {},
  ) {
    this.#keycloakClient = keycloakClient;
    this.#verificationKey = options.verificationKey;
  }

  async validate(accessToken: string): Promise<AuthenticatedPrincipal> {
    try {
      const discovery = await this.#keycloakClient.discover();
      const verificationKey =
        this.#verificationKey ??
        (this.#remoteJwks ??= createRemoteJWKSet(new URL(discovery.jwks_uri)));
      const result = await jwtVerify(accessToken, verificationKey, {
        algorithms: ["RS256"],
        audience: this.#keycloakClient.configuration.audience,
        issuer: this.#keycloakClient.configuration.issuerUrl,
      });

      return createAuthenticatedPrincipal(result.payload);
    } catch {
      throw new JwtValidationError();
    }
  }
}

function createAuthenticatedPrincipal(payload: JWTPayload): AuthenticatedPrincipal {
  if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
    throw new JwtValidationError();
  }

  const email = readOptionalStringClaim(payload, "email");
  const emailVerified = readOptionalBooleanClaim(payload, "email_verified");
  const preferredUsername = readOptionalStringClaim(payload, "preferred_username");

  return {
    ...(email === undefined ? {} : { email }),
    ...(emailVerified === undefined ? {} : { emailVerified }),
    keycloakUserId: payload.sub,
    ...(preferredUsername === undefined ? {} : { preferredUsername }),
  };
}

function readOptionalStringClaim(payload: JWTPayload, claim: string): string | undefined {
  const value = payload[claim];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new JwtValidationError();
  }

  return value;
}

function readOptionalBooleanClaim(payload: JWTPayload, claim: string): boolean | undefined {
  const value = payload[claim];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new JwtValidationError();
  }

  return value;
}
