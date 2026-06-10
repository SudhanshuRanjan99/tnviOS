import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import type { KeycloakSyncPersistence } from "../identity/keycloak-sync.persistence.js";
import { ApiFirstLoginProvisioner } from "./first-login.provider.js";

describe("ApiFirstLoginProvisioner", () => {
  it("maps validated identity claims into transactional provisioning", async () => {
    const result = {
      created: true,
      status: "pending" as const,
      userId: createEntityId<"user">(),
    };
    const persistence = {
      provisionFirstLogin: vi.fn(async () => result),
    } as unknown as KeycloakSyncPersistence;
    const provisioner = new ApiFirstLoginProvisioner(persistence);

    await expect(
      provisioner.provision({
        email: "user@example.com",
        emailVerified: true,
        keycloakUserId: "keycloak-user-id",
        preferredUsername: "user",
      }),
    ).resolves.toEqual(result);
    expect(persistence.provisionFirstLogin).toHaveBeenCalledWith({
      email: "user@example.com",
      emailVerified: true,
      keycloakUserId: "keycloak-user-id",
      preferredUsername: "user",
    });
  });
});
