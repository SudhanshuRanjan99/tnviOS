import { describe, expect, it } from "vitest";

import { FirstLoginEmailRequiredError, FirstLoginProvisioner } from "./first-login-provisioner.js";
import type { ShadowUserRepository } from "./keycloak-sync.js";
import { User } from "./user.entity.js";

describe("FirstLoginProvisioner", () => {
  it("creates missing shadow users as pending", async () => {
    const repository = new MemoryShadowUserRepository();
    const provisioner = new FirstLoginProvisioner(repository);

    await expect(
      provisioner.provision({
        email: "User@Example.com",
        emailVerified: true,
        keycloakUserId: "keycloak-user-id",
        preferredUsername: "user",
      }),
    ).resolves.toMatchObject({
      created: true,
      status: "pending",
    });
    expect(repository.user).toMatchObject({
      email: "user@example.com",
      status: "pending",
      username: "user",
    });
  });

  it("resolves existing active users and refreshes identity claims", async () => {
    const user = new User({
      email: "old@example.com",
      keycloakUserId: "keycloak-user-id",
    });
    user.activate();
    const repository = new MemoryShadowUserRepository(user);
    const provisioner = new FirstLoginProvisioner(repository);

    await expect(
      provisioner.provision({
        email: "new@example.com",
        keycloakUserId: "keycloak-user-id",
      }),
    ).resolves.toMatchObject({
      created: false,
      status: "active",
      userId: user.id,
    });
    expect(repository.user?.email).toBe("new@example.com");
  });

  it("requires email only when creating a missing shadow user", async () => {
    const provisioner = new FirstLoginProvisioner(new MemoryShadowUserRepository());

    await expect(
      provisioner.provision({ keycloakUserId: "keycloak-user-id" }),
    ).rejects.toThrowError(FirstLoginEmailRequiredError);
  });
});

class MemoryShadowUserRepository implements ShadowUserRepository {
  constructor(public user: User | null = null) {}

  async findByKeycloakUserId(keycloakUserId: string): Promise<User | null> {
    return this.user?.keycloakUserId === keycloakUserId ? this.user : null;
  }

  async save(user: User): Promise<void> {
    this.user = user;
  }
}
