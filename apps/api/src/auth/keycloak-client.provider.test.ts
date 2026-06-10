import { describe, expect, it, vi } from "vitest";

import { ApiKeycloakClient } from "./keycloak-client.provider.js";

vi.mock("@tnvios/config", () => ({
  validateEnvironment: vi.fn(() => ({
    JWT_AUDIENCE: "tnvios-api",
    KEYCLOAK_CLIENT_ID: "tnvios-api",
    KEYCLOAK_CLIENT_SECRET: "secret",
    KEYCLOAK_ISSUER_URL: "http://localhost:8080/realms/tnvios",
  })),
}));

describe("ApiKeycloakClient", () => {
  it("lazily creates and reuses the configured Keycloak client", () => {
    const provider = new ApiKeycloakClient();

    expect(provider.client).toBe(provider.client);
    expect(provider.client.configuration).toMatchObject({
      audience: "tnvios-api",
      clientId: "tnvios-api",
      issuerUrl: "http://localhost:8080/realms/tnvios",
    });
  });
});
