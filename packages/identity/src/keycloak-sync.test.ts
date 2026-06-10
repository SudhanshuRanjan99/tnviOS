import { describe, expect, it } from "vitest";

import {
  InvalidKeycloakSyncEventError,
  KeycloakEventSynchronizer,
  MissingShadowUserError,
  parseKeycloakSyncEvent,
  type ShadowUserRepository,
} from "./keycloak-sync.js";
import { User } from "./user.entity.js";

describe("parseKeycloakSyncEvent", () => {
  it("parses a supported event without accepting extra business authorization", () => {
    expect(
      parseKeycloakSyncEvent({
        eventId: "event-id",
        occurredAt: "2026-06-10T00:00:00.000Z",
        roles: ["finance.manager"],
        type: "CREATE_USER",
        user: {
          email: "user@example.com",
          keycloakUserId: "keycloak-user-id",
        },
      }),
    ).toMatchObject({
      eventId: "event-id",
      type: "CREATE_USER",
      user: { keycloakUserId: "keycloak-user-id" },
    });
  });

  it("rejects unsupported event types", () => {
    expect(() =>
      parseKeycloakSyncEvent({
        eventId: "event-id",
        occurredAt: "2026-06-10T00:00:00.000Z",
        type: "GRANT_BUSINESS_ROLE",
        user: { keycloakUserId: "keycloak-user-id" },
      }),
    ).toThrowError(InvalidKeycloakSyncEventError);
  });
});

describe("KeycloakEventSynchronizer", () => {
  it("creates pending shadow users from provisioning events", async () => {
    const repository = new MemoryShadowUserRepository();
    const synchronizer = new KeycloakEventSynchronizer(repository);

    const result = await synchronizer.synchronize(
      parseKeycloakSyncEvent({
        eventId: "event-id",
        occurredAt: "2026-06-10T00:00:00.000Z",
        type: "REGISTER",
        user: {
          email: "User@Example.com",
          keycloakUserId: "keycloak-user-id",
        },
      }),
    );

    expect(result.identityEventType).toBe("identity.user.created");
    expect(repository.user).toMatchObject({
      email: "user@example.com",
      keycloakUserId: "keycloak-user-id",
      status: "pending",
    });
  });

  it("updates and deactivates existing shadow users", async () => {
    const repository = new MemoryShadowUserRepository(
      new User({ email: "old@example.com", keycloakUserId: "keycloak-user-id" }),
    );
    const synchronizer = new KeycloakEventSynchronizer(repository);

    await synchronizer.synchronize(
      parseKeycloakSyncEvent({
        eventId: "update-event",
        occurredAt: "2026-06-10T00:00:00.000Z",
        type: "UPDATE_EMAIL",
        user: {
          email: "new@example.com",
          keycloakUserId: "keycloak-user-id",
        },
      }),
    );
    await synchronizer.synchronize(
      parseKeycloakSyncEvent({
        eventId: "disable-event",
        occurredAt: "2026-06-10T01:00:00.000Z",
        type: "DISABLE_USER",
        user: { keycloakUserId: "keycloak-user-id" },
      }),
    );

    expect(repository.user).toMatchObject({
      email: "new@example.com",
      status: "disabled",
    });
  });

  it("rejects non-provisioning events for unknown users", async () => {
    const synchronizer = new KeycloakEventSynchronizer(new MemoryShadowUserRepository());

    await expect(
      synchronizer.synchronize(
        parseKeycloakSyncEvent({
          eventId: "event-id",
          occurredAt: "2026-06-10T00:00:00.000Z",
          type: "LOGIN",
          user: { keycloakUserId: "missing-user" },
        }),
      ),
    ).rejects.toThrowError(MissingShadowUserError);
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
