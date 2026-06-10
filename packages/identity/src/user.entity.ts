import { EntitySchema } from "@mikro-orm/core";
import type { UserId } from "@tnvios/database/contracts";
import { createEntityId } from "@tnvios/database/identifiers";

export const USER_STATUSES = ["pending", "active", "disabled"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export interface CreateShadowUserInput {
  readonly email: string;
  readonly emailVerified?: boolean;
  readonly keycloakUserId: string;
  readonly status?: UserStatus;
  readonly username?: string | null;
}

export class User {
  id: UserId = createEntityId<"user">();

  keycloakUserId!: string;

  email!: string;

  username: string | null = null;

  status: UserStatus = "pending";

  emailVerified = false;

  lastLoginAt: Date | null = null;

  createdAt: Date = new Date();

  updatedAt: Date = new Date();

  deletedAt: Date | null = null;

  constructor(input: CreateShadowUserInput) {
    this.keycloakUserId = normalizeRequiredIdentityValue(input.keycloakUserId, "keycloakUserId");
    this.email = normalizeRequiredIdentityValue(input.email, "email").toLowerCase();
    this.emailVerified = input.emailVerified ?? false;
    this.status = input.status ?? "pending";
    this.username = normalizeOptionalIdentityValue(input.username);
  }

  activate(): void {
    this.status = "active";
    this.deletedAt = null;
  }

  disable(at: Date = new Date()): void {
    this.status = "disabled";
    this.deletedAt = at;
  }

  recordLogin(at: Date = new Date()): void {
    this.lastLoginAt = at;
  }

  synchronizeIdentity(
    input: Pick<CreateShadowUserInput, "email" | "emailVerified" | "username">,
  ): void {
    this.email = normalizeRequiredIdentityValue(input.email, "email").toLowerCase();
    this.emailVerified = input.emailVerified ?? false;
    this.username = normalizeOptionalIdentityValue(input.username);
  }
}

export const UserSchema = new EntitySchema<User>({
  class: User,
  indexes: [{ name: "users_status_index", properties: ["status"] }],
  properties: {
    id: { primary: true, type: "uuid" },
    keycloakUserId: {
      fieldName: "keycloak_user_id",
      type: "text",
      unique: "users_keycloak_user_id_unique",
    },
    email: { type: "text", unique: "users_email_unique" },
    username: { nullable: true, type: "text" },
    status: {
      enum: true,
      items: () => USER_STATUSES,
      nativeEnumName: "user_status",
    },
    emailVerified: { default: false, fieldName: "email_verified", type: "boolean" },
    lastLoginAt: { fieldName: "last_login_at", nullable: true, type: "timestamptz" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
    updatedAt: { fieldName: "updated_at", onUpdate: () => new Date(), type: "timestamptz" },
    deletedAt: { fieldName: "deleted_at", nullable: true, type: "timestamptz" },
  },
  tableName: "users",
});

export class InvalidShadowUserIdentityError extends Error {
  constructor(field: "email" | "keycloakUserId") {
    super(`Shadow user ${field} is required.`);
    this.name = "InvalidShadowUserIdentityError";
  }
}

function normalizeRequiredIdentityValue(value: string, field: "email" | "keycloakUserId"): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new InvalidShadowUserIdentityError(field);
  }

  return normalized;
}

function normalizeOptionalIdentityValue(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
