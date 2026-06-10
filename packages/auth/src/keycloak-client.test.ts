import { describe, expect, it, vi } from "vitest";

import {
  createKeycloakConfiguration,
  KeycloakClient,
  KeycloakIntegrationError,
} from "./keycloak-client.js";

const configuration = createKeycloakConfiguration({
  JWT_AUDIENCE: "tnvios-api",
  KEYCLOAK_CLIENT_ID: "tnvios-api",
  KEYCLOAK_CLIENT_SECRET: "local-secret",
  KEYCLOAK_ISSUER_URL: "http://localhost:8080/realms/tnvios/",
});

const discovery = {
  authorization_endpoint: "http://localhost:8080/realms/tnvios/protocol/openid-connect/auth",
  issuer: "http://localhost:8080/realms/tnvios",
  jwks_uri: "http://localhost:8080/realms/tnvios/protocol/openid-connect/certs",
  token_endpoint: "http://localhost:8080/realms/tnvios/protocol/openid-connect/token",
  userinfo_endpoint: "http://localhost:8080/realms/tnvios/protocol/openid-connect/userinfo",
};

describe("createKeycloakConfiguration", () => {
  it("normalizes the issuer and creates the discovery URL", () => {
    expect(configuration).toEqual({
      audience: "tnvios-api",
      clientId: "tnvios-api",
      clientSecret: "local-secret",
      discoveryUrl: "http://localhost:8080/realms/tnvios/.well-known/openid-configuration",
      issuerUrl: "http://localhost:8080/realms/tnvios",
    });
  });
});

describe("KeycloakClient", () => {
  it("discovers and caches the realm OIDC configuration", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json(discovery));
    const client = new KeycloakClient(configuration, { fetch });

    await expect(client.discover()).resolves.toEqual(discovery);
    await client.discover();

    expect(fetch).toHaveBeenCalledOnce();
  });

  it("requests a service-account token without exposing credentials in errors", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(discovery))
      .mockResolvedValueOnce(
        Response.json({
          access_token: "access-token",
          expires_in: 300,
          scope: "openid",
          token_type: "Bearer",
        }),
      );
    const client = new KeycloakClient(configuration, { fetch });

    await expect(client.requestClientCredentialsToken(["openid"])).resolves.toEqual({
      accessToken: "access-token",
      expiresIn: 300,
      scope: "openid",
      tokenType: "Bearer",
    });

    expect(fetch.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      body: new URLSearchParams({ grant_type: "client_credentials", scope: "openid" }),
    });
  });

  it("rejects discovery documents from a different issuer", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json({ ...discovery, issuer: "https://identity.example.com" }));
    const client = new KeycloakClient(configuration, { fetch });

    await expect(client.discover()).rejects.toThrowError(
      new KeycloakIntegrationError("Keycloak discovery returned an unexpected issuer."),
    );
  });

  it("reports provider failures without returning response bodies", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("sensitive provider details", { status: 503 }));
    const client = new KeycloakClient(configuration, { fetch });

    await expect(client.discover()).rejects.toMatchObject({
      message: "Keycloak discovery failed with HTTP 503.",
      status: 503,
    });
  });
});
