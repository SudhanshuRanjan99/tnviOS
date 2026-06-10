import { createHmac } from "node:crypto";

import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import type { KeycloakSyncPersistence } from "./keycloak-sync.persistence.js";
import { KeycloakWebhookController } from "./keycloak-webhook.controller.js";
import { KeycloakWebhookVerifier } from "./keycloak-webhook-verifier.js";

const secret = "webhook-secret";
const now = Date.parse("2026-06-10T00:00:00.000Z");
const timestamp = String(now / 1000);
const payload = {
  eventId: "event-id",
  occurredAt: "2026-06-10T00:00:00.000Z",
  type: "CREATE_USER",
  user: {
    email: "user@example.com",
    keycloakUserId: "keycloak-user-id",
  },
} as const;
const rawBody = Buffer.from(JSON.stringify(payload));

describe("KeycloakWebhookController", () => {
  it("synchronizes a signed Keycloak event", async () => {
    const userId = createEntityId<"user">();
    const persistence = {
      synchronize: vi.fn(async () => ({
        identityEventType: "identity.user.created" as const,
        userId,
      })),
    } as unknown as KeycloakSyncPersistence;
    const controller = createController(persistence);

    await expect(
      controller.synchronize({ body: payload, rawBody }, timestamp, createSignature(rawBody)),
    ).resolves.toEqual({
      data: {
        eventId: "event-id",
        identityEventType: "identity.user.created",
        userId,
      },
      meta: {},
      success: true,
    });
  });

  it("rejects invalid signatures and replayed events", async () => {
    const persistence = {
      synchronize: vi.fn(async () => ({
        identityEventType: "identity.user.created" as const,
        userId: createEntityId<"user">(),
      })),
    } as unknown as KeycloakSyncPersistence;
    const controller = createController(persistence);

    await expect(
      controller.synchronize({ body: payload, rawBody }, timestamp, "sha256=".padEnd(71, "0")),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await controller.synchronize({ body: payload, rawBody }, timestamp, createSignature(rawBody));
    await expect(
      controller.synchronize({ body: payload, rawBody }, timestamp, createSignature(rawBody)),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects unsupported signed events", async () => {
    const unsupported = { ...payload, type: "GRANT_BUSINESS_ROLE" };
    const body = Buffer.from(JSON.stringify(unsupported));
    const controller = createController({
      synchronize: vi.fn(),
    } as unknown as KeycloakSyncPersistence);

    await expect(
      controller.synchronize(
        { body: unsupported, rawBody: body },
        timestamp,
        createSignature(body),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function createController(persistence: KeycloakSyncPersistence): KeycloakWebhookController {
  return new KeycloakWebhookController(
    persistence,
    new KeycloakWebhookVerifier({ now: () => now, secret }),
  );
}

function createSignature(body: Buffer): string {
  return `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(body)
    .digest("hex")}`;
}
