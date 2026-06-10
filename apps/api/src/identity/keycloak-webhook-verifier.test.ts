import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  InvalidKeycloakWebhookError,
  KeycloakWebhookVerifier,
  ReplayedKeycloakWebhookError,
} from "./keycloak-webhook-verifier.js";

const secret = "webhook-secret";
const now = Date.parse("2026-06-10T00:00:00.000Z");
const timestamp = String(now / 1000);
const rawBody = Buffer.from('{"eventId":"event-id"}');

describe("KeycloakWebhookVerifier", () => {
  it("accepts a valid signature and reserves the event ID", () => {
    const verifier = createVerifier();

    expect(() => verifier.reserve("event-id", rawBody, timestamp, sign(rawBody))).not.toThrow();
    expect(() => verifier.reserve("event-id", rawBody, timestamp, sign(rawBody))).toThrowError(
      ReplayedKeycloakWebhookError,
    );
  });

  it("allows a failed delivery to be retried after release", () => {
    const verifier = createVerifier();

    verifier.reserve("event-id", rawBody, timestamp, sign(rawBody));
    verifier.release("event-id");

    expect(() => verifier.reserve("event-id", rawBody, timestamp, sign(rawBody))).not.toThrow();
  });

  it.each([
    ["tampered body", Buffer.from('{"eventId":"different"}'), timestamp],
    ["stale timestamp", rawBody, String(now / 1000 - 301)],
  ])("rejects a delivery with %s", (_name, body, deliveryTimestamp) => {
    const verifier = createVerifier();

    expect(() => verifier.reserve("event-id", body, deliveryTimestamp, sign(rawBody))).toThrowError(
      InvalidKeycloakWebhookError,
    );
  });
});

function createVerifier(): KeycloakWebhookVerifier {
  return new KeycloakWebhookVerifier({ now: () => now, secret });
}

function sign(body: Buffer): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest("hex");
  return `sha256=${digest}`;
}
