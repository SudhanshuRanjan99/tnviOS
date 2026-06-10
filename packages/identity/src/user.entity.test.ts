import { describe, expect, it } from "vitest";

import { InvalidShadowUserIdentityError, User } from "./user.entity.js";

describe("User shadow entity", () => {
  it("creates pending users with normalized identity fields", () => {
    const user = new User({
      email: " User@Example.com ",
      keycloakUserId: " keycloak-user-id ",
      username: " user ",
    });

    expect(user).toMatchObject({
      deletedAt: null,
      email: "user@example.com",
      emailVerified: false,
      keycloakUserId: "keycloak-user-id",
      lastLoginAt: null,
      status: "pending",
      username: "user",
    });
  });

  it("synchronizes identity without accepting Keycloak business roles", () => {
    const user = new User({
      email: "old@example.com",
      keycloakUserId: "keycloak-user-id",
    });

    user.synchronizeIdentity({
      email: "new@example.com",
      emailVerified: true,
      username: "new-user",
    });

    expect(user).toMatchObject({
      email: "new@example.com",
      emailVerified: true,
      username: "new-user",
    });
    expect(user).not.toHaveProperty("roles");
  });

  it("records lifecycle state and login timestamps", () => {
    const user = new User({
      email: "user@example.com",
      keycloakUserId: "keycloak-user-id",
    });
    const timestamp = new Date("2026-06-10T00:00:00.000Z");

    user.activate();
    user.recordLogin(timestamp);
    expect(user.status).toBe("active");
    expect(user.lastLoginAt).toBe(timestamp);

    user.disable(timestamp);
    expect(user.status).toBe("disabled");
    expect(user.deletedAt).toBe(timestamp);
  });

  it("requires Keycloak ID and email", () => {
    expect(() => new User({ email: "user@example.com", keycloakUserId: " " })).toThrowError(
      InvalidShadowUserIdentityError,
    );
    expect(() => new User({ email: " ", keycloakUserId: "keycloak-user-id" })).toThrowError(
      InvalidShadowUserIdentityError,
    );
  });
});
