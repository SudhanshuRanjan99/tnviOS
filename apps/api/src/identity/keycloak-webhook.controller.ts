import {
  BadRequestException,
  ConflictException,
  Controller,
  Headers,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  InvalidKeycloakSyncEventError,
  MissingShadowUserError,
  parseKeycloakSyncEvent,
} from "@tnvios/identity/keycloak-sync";

import { PublicRoute } from "../auth/public-route.decorator.js";
import { apiLogger } from "../logging/api-logger.js";
import { KeycloakSyncPersistence } from "./keycloak-sync.persistence.js";
import {
  InvalidKeycloakWebhookError,
  KEYCLOAK_WEBHOOK_HEADERS,
  KeycloakWebhookVerifier,
  ReplayedKeycloakWebhookError,
} from "./keycloak-webhook-verifier.js";

interface RawBodyRequest {
  readonly body: unknown;
  readonly rawBody?: Buffer;
}

export interface KeycloakSyncResponse {
  readonly data: {
    readonly eventId: string;
    readonly identityEventType: string;
    readonly userId: string;
  };
  readonly meta: Record<string, never>;
  readonly success: true;
}

@Controller("internal/v1/identity/keycloak/events")
@PublicRoute()
export class KeycloakWebhookController {
  constructor(
    private readonly persistence: KeycloakSyncPersistence,
    private readonly verifier: KeycloakWebhookVerifier,
  ) {}

  @Post()
  async synchronize(
    @Req() request: RawBodyRequest,
    @Headers(KEYCLOAK_WEBHOOK_HEADERS.timestamp) timestamp: string | undefined,
    @Headers(KEYCLOAK_WEBHOOK_HEADERS.signature) signature: string | undefined,
  ): Promise<KeycloakSyncResponse> {
    let eventId: string | undefined;

    try {
      eventId = readEventId(request.body);
      this.verifier.reserve(eventId, requireRawBody(request), timestamp, signature);
      const event = parseKeycloakSyncEvent(request.body);
      const result = await this.persistence.synchronize(event);

      apiLogger.info("Keycloak identity event synchronized", {
        eventId: event.eventId,
        identityEventType: result.identityEventType,
        userId: result.userId,
      });

      return {
        data: {
          eventId: event.eventId,
          identityEventType: result.identityEventType,
          userId: result.userId,
        },
        meta: {},
        success: true,
      };
    } catch (error) {
      if (eventId !== undefined && !(error instanceof ReplayedKeycloakWebhookError)) {
        this.verifier.release(eventId);
      }

      if (error instanceof InvalidKeycloakWebhookError) {
        throw new UnauthorizedException({
          code: "INVALID_WEBHOOK_SIGNATURE",
          message: error.message,
        });
      }

      if (error instanceof ReplayedKeycloakWebhookError) {
        throw new ConflictException({
          code: "WEBHOOK_REPLAYED",
          message: error.message,
        });
      }

      if (
        error instanceof InvalidKeycloakSyncEventError ||
        error instanceof MissingShadowUserError
      ) {
        throw new BadRequestException({
          code: "INVALID_KEYCLOAK_EVENT",
          message: error.message,
        });
      }

      throw error;
    }
  }
}

function requireRawBody(request: RawBodyRequest): Buffer {
  if (request.rawBody === undefined) {
    throw new InvalidKeycloakWebhookError();
  }

  return request.rawBody;
}

function readEventId(value: unknown): string {
  if (
    typeof value !== "object" ||
    value === null ||
    !("eventId" in value) ||
    typeof value.eventId !== "string" ||
    value.eventId.trim().length === 0
  ) {
    throw new InvalidKeycloakWebhookError();
  }

  return value.eventId.trim();
}
