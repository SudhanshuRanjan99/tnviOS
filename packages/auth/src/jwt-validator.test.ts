import { generateKeyPair, SignJWT, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import type { KeycloakConfiguration, KeycloakClient } from "./keycloak-client.js";
import { JwtValidationError, KeycloakJwtValidator } from "./jwt-validator.js";

const configuration: KeycloakConfiguration = {
  audience: "tnvios-api",
  clientId: "tnvios-api",
  clientSecret: "secret",
  discoveryUrl: "https://identity.example.com/realms/tnvios/.well-known/openid-configuration",
  issuerUrl: "https://identity.example.com/realms/tnvios",
};

let privateKey: CryptoKey;
let verificationKey: JWTVerifyGetKey;

beforeAll(async () => {
  const keyPair = await generateKeyPair("RS256");
  privateKey = keyPair.privateKey;
  verificationKey = async () => keyPair.publicKey;
});

describe("KeycloakJwtValidator", () => {
  it("validates a signed Keycloak access token and returns identity claims only", async () => {
    const validator = createValidator();
    const token = await createToken({
      email: "user@example.com",
      email_verified: true,
      preferred_username: "user@example.com",
      realm_access: { roles: ["forbidden-business-role"] },
      sub: "keycloak-user-id",
    });

    await expect(validator.validate(token)).resolves.toEqual({
      email: "user@example.com",
      emailVerified: true,
      keycloakUserId: "keycloak-user-id",
      preferredUsername: "user@example.com",
    });
  });

  it.each([
    ["wrong issuer", { issuer: "https://identity.example.com/realms/other" }],
    ["wrong audience", { audience: "another-api" }],
    ["expired token", { expirationTime: "0s" }],
    ["future not-before", { notBefore: "5m" }],
  ])("rejects a token with %s", async (_name, overrides) => {
    const validator = createValidator();
    const token = await createToken({ sub: "keycloak-user-id" }, overrides);

    await expect(validator.validate(token)).rejects.toThrowError(new JwtValidationError());
  });

  it("rejects tokens without a subject", async () => {
    const validator = createValidator();
    const token = await createToken({});

    await expect(validator.validate(token)).rejects.toThrowError(new JwtValidationError());
  });

  it("rejects tokens signed by an untrusted key", async () => {
    const validator = createValidator();
    const untrustedKeyPair = await generateKeyPair("RS256");
    const token = await createToken(
      { sub: "keycloak-user-id" },
      { privateKey: untrustedKeyPair.privateKey },
    );

    await expect(validator.validate(token)).rejects.toThrowError(new JwtValidationError());
  });

  it("rejects malformed identity claim types", async () => {
    const validator = createValidator();
    const token = await createToken({
      email_verified: "yes",
      sub: "keycloak-user-id",
    });

    await expect(validator.validate(token)).rejects.toThrowError(new JwtValidationError());
  });
});

function createValidator(): KeycloakJwtValidator {
  const keycloakClient: Pick<KeycloakClient, "configuration" | "discover"> = {
    configuration,
    discover: async () => ({
      authorization_endpoint: `${configuration.issuerUrl}/protocol/openid-connect/auth`,
      issuer: configuration.issuerUrl,
      jwks_uri: `${configuration.issuerUrl}/protocol/openid-connect/certs`,
      token_endpoint: `${configuration.issuerUrl}/protocol/openid-connect/token`,
    }),
  };

  return new KeycloakJwtValidator(keycloakClient, { verificationKey });
}

async function createToken(
  claims: Record<string, unknown>,
  overrides: {
    readonly audience?: string;
    readonly expirationTime?: string;
    readonly issuer?: string;
    readonly notBefore?: string;
    readonly privateKey?: CryptoKey;
  } = {},
): Promise<string> {
  const token = new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-key", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(overrides.issuer ?? configuration.issuerUrl)
    .setAudience(overrides.audience ?? configuration.audience)
    .setExpirationTime(overrides.expirationTime ?? "5m");

  if (overrides.notBefore !== undefined) {
    token.setNotBefore(overrides.notBefore);
  }

  return token.sign(overrides.privateKey ?? privateKey);
}
