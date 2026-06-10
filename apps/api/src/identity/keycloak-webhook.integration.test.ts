import { createHmac } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createEntityId } from "@tnvios/database/identifiers";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppModule } from "../app.module.js";
import { configureApplication } from "../application.js";
import { KeycloakSyncPersistence } from "./keycloak-sync.persistence.js";
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
};
const rawBody = JSON.stringify(payload);

describe("POST /internal/v1/identity/keycloak/events", () => {
  let application: INestApplication | undefined;
  let persistence: {
    readonly synchronize: ReturnType<typeof vi.fn>;
  };

  afterEach(async () => {
    await application?.close();
  });

  it("accepts a signed Keycloak event outside the public API prefix", async () => {
    const userId = await createTestApplication();

    const response = await sendWebhook(createSignature(rawBody)).expect(201);

    expect(response.body).toMatchObject({
      data: {
        eventId: "event-id",
        identityEventType: "identity.user.created",
        userId,
      },
      success: true,
    });
    expect(persistence.synchronize).toHaveBeenCalledOnce();
  });

  it("rejects unsigned and tampered deliveries before persistence", async () => {
    await createTestApplication();

    await sendWebhook(undefined).expect(401);
    await request(requireApplication().getHttpServer())
      .post("/internal/v1/identity/keycloak/events")
      .set("content-type", "application/json")
      .set("x-tnvios-webhook-timestamp", timestamp)
      .set("x-tnvios-keycloak-signature", createSignature(rawBody))
      .send(JSON.stringify({ ...payload, eventId: "tampered-event" }))
      .expect(401);

    expect(persistence.synchronize).not.toHaveBeenCalled();
  });

  it("rejects replayed deliveries", async () => {
    await createTestApplication();

    await sendWebhook(createSignature(rawBody)).expect(201);
    const response = await sendWebhook(createSignature(rawBody)).expect(409);

    expect(response.body).toMatchObject({
      code: "WEBHOOK_REPLAYED",
    });
    expect(persistence.synchronize).toHaveBeenCalledOnce();
  });

  async function createTestApplication() {
    const userId = createEntityId<"user">();
    persistence = {
      synchronize: vi.fn(async () => ({
        identityEventType: "identity.user.created",
        userId,
      })),
    };
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KeycloakSyncPersistence)
      .useValue(persistence)
      .overrideProvider(KeycloakWebhookVerifier)
      .useValue(new KeycloakWebhookVerifier({ now: () => now, secret }))
      .compile();
    application = testingModule.createNestApplication({ rawBody: true });
    configureApplication(application);
    await application.init();

    return userId;
  }

  function sendWebhook(signature: string | undefined) {
    const webhookRequest = request(requireApplication().getHttpServer())
      .post("/internal/v1/identity/keycloak/events")
      .set("content-type", "application/json")
      .set("x-tnvios-webhook-timestamp", timestamp)
      .send(rawBody);

    return signature === undefined
      ? webhookRequest
      : webhookRequest.set("x-tnvios-keycloak-signature", signature);
  }

  function requireApplication(): INestApplication {
    if (application === undefined) {
      throw new Error("Test application is not initialized.");
    }

    return application;
  }
});

function createSignature(rawBody: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
}
