import { createHmac, timingSafeEqual } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { validateEnvironment } from "@tnvios/config";

export const KEYCLOAK_WEBHOOK_HEADERS = {
  signature: "x-tnvios-keycloak-signature",
  timestamp: "x-tnvios-webhook-timestamp",
} as const;

const DEFAULT_MAX_AGE_SECONDS = 300;

export interface KeycloakWebhookVerifierOptions {
  readonly maxAgeSeconds?: number;
  readonly now?: () => number;
  readonly secret?: string;
}

export class InvalidKeycloakWebhookError extends Error {
  constructor() {
    super("Keycloak webhook authentication failed.");
    this.name = "InvalidKeycloakWebhookError";
  }
}

export class ReplayedKeycloakWebhookError extends Error {
  constructor() {
    super("Keycloak webhook event was already received.");
    this.name = "ReplayedKeycloakWebhookError";
  }
}

@Injectable()
export class KeycloakWebhookVerifier {
  readonly #maxAgeSeconds: number;
  readonly #now: () => number;
  readonly #secret?: string;
  readonly #reservedEventIds = new Map<string, number>();

  constructor(options: KeycloakWebhookVerifierOptions = {}) {
    this.#maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
    this.#now = options.now ?? (() => Date.now());
    this.#secret = options.secret;
  }

  reserve(
    eventId: string,
    rawBody: Buffer,
    timestampHeader: string | readonly string[] | undefined,
    signatureHeader: string | readonly string[] | undefined,
  ): void {
    const timestamp = parseTimestamp(timestampHeader);
    const signature = parseSignature(signatureHeader);
    const nowSeconds = this.#now() / 1000;
    const ageSeconds = Math.abs(nowSeconds - timestamp);

    if (ageSeconds > this.#maxAgeSeconds) {
      throw new InvalidKeycloakWebhookError();
    }

    const expected = createHmac("sha256", this.#getSecret())
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest();

    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
      throw new InvalidKeycloakWebhookError();
    }

    this.#pruneExpiredReservations(nowSeconds);

    if (this.#reservedEventIds.has(eventId)) {
      throw new ReplayedKeycloakWebhookError();
    }

    this.#reservedEventIds.set(eventId, nowSeconds + this.#maxAgeSeconds);
  }

  release(eventId: string): void {
    this.#reservedEventIds.delete(eventId);
  }

  #getSecret(): string {
    return this.#secret ?? validateEnvironment(process.env).KEYCLOAK_WEBHOOK_SECRET;
  }

  #pruneExpiredReservations(nowSeconds: number): void {
    for (const [eventId, expiresAt] of this.#reservedEventIds) {
      if (expiresAt <= nowSeconds) {
        this.#reservedEventIds.delete(eventId);
      }
    }
  }
}

function parseTimestamp(value: string | readonly string[] | undefined): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new InvalidKeycloakWebhookError();
  }

  return Number(value);
}

function parseSignature(value: string | readonly string[] | undefined): Buffer {
  if (typeof value !== "string" || !/^sha256=[a-f0-9]{64}$/i.test(value)) {
    throw new InvalidKeycloakWebhookError();
  }

  return Buffer.from(value.slice("sha256=".length), "hex");
}
