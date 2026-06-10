import type { UserId } from "@tnvios/database/contracts";

import { User } from "./user.entity.js";

export const KEYCLOAK_SYNC_EVENT_TYPES = [
  "CREATE_USER",
  "DELETE_USER",
  "DISABLE_USER",
  "LOGIN",
  "LOGOUT",
  "MFA_SETUP",
  "REGISTER",
  "RESET_PASSWORD",
  "UPDATE_CREDENTIAL",
  "UPDATE_EMAIL",
  "UPDATE_PROFILE",
  "VERIFY_EMAIL",
] as const;

export type KeycloakSyncEventType = (typeof KEYCLOAK_SYNC_EVENT_TYPES)[number];

export type IdentityEventType =
  | "identity.user.created"
  | "identity.user.deactivated"
  | "identity.user.email_verified"
  | "identity.user.logged_in"
  | "identity.user.logged_out"
  | "identity.user.mfa_updated"
  | "identity.user.password_reset"
  | "identity.user.updated";

export interface KeycloakSyncEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly type: KeycloakSyncEventType;
  readonly user: {
    readonly email?: string;
    readonly emailVerified?: boolean;
    readonly keycloakUserId: string;
    readonly username?: string | null;
  };
}

export interface KeycloakSyncResult {
  readonly identityEventType: IdentityEventType;
  readonly userId: UserId;
}

export interface ShadowUserRepository {
  findByKeycloakUserId(keycloakUserId: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export class InvalidKeycloakSyncEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidKeycloakSyncEventError";
  }
}

export class MissingShadowUserError extends Error {
  constructor(keycloakUserId: string) {
    super(`Shadow user "${keycloakUserId}" does not exist.`);
    this.name = "MissingShadowUserError";
  }
}

export class KeycloakEventSynchronizer {
  constructor(private readonly users: ShadowUserRepository) {}

  async synchronize(event: KeycloakSyncEvent): Promise<KeycloakSyncResult> {
    const identityEventType = mapKeycloakEventType(event.type);
    let user = await this.users.findByKeycloakUserId(event.user.keycloakUserId);

    if (user === null) {
      if (!isProvisioningEvent(event.type)) {
        throw new MissingShadowUserError(event.user.keycloakUserId);
      }

      user = new User({
        email: requireEmail(event),
        emailVerified: event.user.emailVerified,
        keycloakUserId: event.user.keycloakUserId,
        username: event.user.username,
      });
    } else {
      applyExistingUserEvent(user, event);
    }

    await this.users.save(user);

    return { identityEventType, userId: user.id };
  }
}

export function parseKeycloakSyncEvent(value: unknown): KeycloakSyncEvent {
  if (!isRecord(value) || !isRecord(value.user)) {
    throw new InvalidKeycloakSyncEventError("Keycloak event payload is invalid.");
  }

  const eventId = readRequiredString(value, "eventId");
  const type = readEventType(value.type);
  const keycloakUserId = readRequiredString(value.user, "keycloakUserId");
  const occurredAtValue = readRequiredString(value, "occurredAt");
  const occurredAt = new Date(occurredAtValue);

  if (Number.isNaN(occurredAt.getTime())) {
    throw new InvalidKeycloakSyncEventError("Keycloak event occurredAt is invalid.");
  }

  const email = readOptionalString(value.user, "email");
  const username = readOptionalNullableString(value.user, "username");
  const emailVerified = value.user.emailVerified;

  if (emailVerified !== undefined && typeof emailVerified !== "boolean") {
    throw new InvalidKeycloakSyncEventError("Keycloak event emailVerified is invalid.");
  }

  return {
    eventId,
    occurredAt,
    type,
    user: {
      ...(email === undefined ? {} : { email }),
      ...(emailVerified === undefined ? {} : { emailVerified }),
      keycloakUserId,
      ...(username === undefined ? {} : { username }),
    },
  };
}

export function mapKeycloakEventType(type: KeycloakSyncEventType): IdentityEventType {
  switch (type) {
    case "CREATE_USER":
    case "REGISTER":
      return "identity.user.created";
    case "DELETE_USER":
    case "DISABLE_USER":
      return "identity.user.deactivated";
    case "LOGIN":
      return "identity.user.logged_in";
    case "LOGOUT":
      return "identity.user.logged_out";
    case "MFA_SETUP":
    case "UPDATE_CREDENTIAL":
      return "identity.user.mfa_updated";
    case "RESET_PASSWORD":
      return "identity.user.password_reset";
    case "UPDATE_EMAIL":
    case "UPDATE_PROFILE":
      return "identity.user.updated";
    case "VERIFY_EMAIL":
      return "identity.user.email_verified";
  }
}

function applyExistingUserEvent(user: User, event: KeycloakSyncEvent): void {
  switch (event.type) {
    case "CREATE_USER":
    case "REGISTER":
      user.synchronizeIdentity({
        email: event.user.email ?? user.email,
        emailVerified: event.user.emailVerified ?? user.emailVerified,
        username: event.user.username === undefined ? user.username : event.user.username,
      });
      return;
    case "DELETE_USER":
    case "DISABLE_USER":
      user.disable(event.occurredAt);
      return;
    case "LOGIN":
      user.recordLogin(event.occurredAt);
      return;
    case "UPDATE_EMAIL":
    case "UPDATE_PROFILE":
    case "VERIFY_EMAIL":
      user.synchronizeIdentity({
        email: event.user.email ?? user.email,
        emailVerified:
          event.type === "VERIFY_EMAIL" ? true : (event.user.emailVerified ?? user.emailVerified),
        username: event.user.username === undefined ? user.username : event.user.username,
      });
      return;
    default:
      return;
  }
}

function isProvisioningEvent(type: KeycloakSyncEventType): boolean {
  return type === "CREATE_USER" || type === "REGISTER";
}

function requireEmail(event: KeycloakSyncEvent): string {
  if (event.user.email === undefined) {
    throw new InvalidKeycloakSyncEventError("Provisioning events require user.email.");
  }

  return event.user.email;
}

function readEventType(value: unknown): KeycloakSyncEventType {
  if (
    typeof value !== "string" ||
    !(KEYCLOAK_SYNC_EVENT_TYPES as readonly string[]).includes(value)
  ) {
    throw new InvalidKeycloakSyncEventError("Keycloak event type is unsupported.");
  }

  return value as KeycloakSyncEventType;
}

function readRequiredString(value: Record<string, unknown>, key: string): string {
  const result = readOptionalString(value, key);

  if (result === undefined) {
    throw new InvalidKeycloakSyncEventError(`Keycloak event ${key} is required.`);
  }

  return result;
}

function readOptionalString(value: Record<string, unknown>, key: string): string | undefined {
  const result = value[key];

  if (result === undefined) {
    return undefined;
  }

  if (typeof result !== "string" || result.trim().length === 0) {
    throw new InvalidKeycloakSyncEventError(`Keycloak event ${key} is invalid.`);
  }

  return result.trim();
}

function readOptionalNullableString(
  value: Record<string, unknown>,
  key: string,
): string | null | undefined {
  return value[key] === null ? null : readOptionalString(value, key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
