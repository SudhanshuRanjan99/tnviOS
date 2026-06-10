import { EntitySchema } from "@mikro-orm/core";
import type {
  NotificationDeliveryId,
  NotificationId,
  NotificationTemplateId,
  OrganizationId,
  TenantId,
  UserId,
} from "@tnvios/database/contracts";
import { createEntityId } from "@tnvios/database/identifiers";

export const NOTIFICATION_CHANNELS = ["in-app", "email"] as const;
export const NOTIFICATION_STATUSES = ["queued", "sent", "failed", "read"] as const;
export const DELIVERY_STATUSES = ["pending", "sent", "failed"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export class Notification {
  id: NotificationId = createEntityId<"notification">();
  tenantId: TenantId;
  organizationId: OrganizationId | null;
  userId: UserId;
  templateKey: string | null;
  title: string;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string | null;
  readAt: Date | null = null;
  metadata: Record<string, unknown>;
  createdAt = new Date();
  updatedAt = new Date();

  constructor(input: {
    tenantId: TenantId;
    organizationId?: OrganizationId | null;
    userId: UserId;
    templateKey?: string | null;
    title: string;
    message: string;
    channel: NotificationChannel;
    recipient?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId ?? null;
    this.userId = input.userId;
    this.templateKey = optional(input.templateKey);
    this.title = required(input.title, "title");
    this.message = required(input.message, "message");
    this.channel = input.channel;
    this.status = input.channel === "in-app" ? "sent" : "queued";
    this.recipient = optional(input.recipient);
    this.metadata = input.metadata ?? {};
  }

  markRead(at = new Date()): void {
    this.status = "read";
    this.readAt = at;
    this.updatedAt = at;
  }

  markSent(at = new Date()): void {
    this.status = "sent";
    this.updatedAt = at;
  }

  markFailed(at = new Date()): void {
    this.status = "failed";
    this.updatedAt = at;
  }
}

export class NotificationTemplate {
  id: NotificationTemplateId = createEntityId<"notification_template">();
  tenantId: TenantId | null;
  key: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  active = true;
  createdAt = new Date();
  updatedAt = new Date();

  constructor(input: {
    tenantId?: TenantId | null;
    key: string;
    channel: NotificationChannel;
    subject: string;
    body: string;
  }) {
    this.tenantId = input.tenantId ?? null;
    this.key = templateKey(input.key);
    this.channel = input.channel;
    this.subject = required(input.subject, "subject");
    this.body = required(input.body, "body");
  }
}

export class NotificationDelivery {
  id: NotificationDeliveryId = createEntityId<"notification_delivery">();
  notificationId: NotificationId;
  provider: string;
  status: DeliveryStatus = "pending";
  providerMessageId: string | null = null;
  error: string | null = null;
  attempts = 0;
  createdAt = new Date();
  updatedAt = new Date();

  constructor(input: { notificationId: NotificationId; provider: string }) {
    this.notificationId = input.notificationId;
    this.provider = required(input.provider, "provider");
  }

  markSent(providerMessageId: string, at = new Date()): void {
    this.status = "sent";
    this.providerMessageId = required(providerMessageId, "providerMessageId");
    this.attempts += 1;
    this.updatedAt = at;
  }

  markFailed(error: string, at = new Date()): void {
    this.status = "failed";
    this.error = required(error, "error");
    this.attempts += 1;
    this.updatedAt = at;
  }
}

export const NotificationSchema = new EntitySchema<Notification>({
  class: Notification,
  tableName: "notifications",
  indexes: [
    {
      name: "notifications_inbox_index",
      properties: ["tenantId", "userId", "channel", "createdAt"],
    },
    { name: "notifications_organization_index", properties: ["organizationId"] },
  ],
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    organizationId: { fieldName: "organization_id", nullable: true, type: "uuid" },
    userId: { fieldName: "user_id", type: "uuid" },
    templateKey: { fieldName: "template_key", nullable: true, type: "text" },
    title: { type: "text" },
    message: { type: "text" },
    channel: {
      enum: true,
      items: () => NOTIFICATION_CHANNELS,
      nativeEnumName: "notification_channel",
    },
    status: {
      enum: true,
      items: () => NOTIFICATION_STATUSES,
      nativeEnumName: "notification_status",
    },
    recipient: { nullable: true, type: "text" },
    readAt: { fieldName: "read_at", nullable: true, type: "timestamptz" },
    metadata: { type: "jsonb" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
    updatedAt: { fieldName: "updated_at", type: "timestamptz" },
  },
});

export const NotificationTemplateSchema = new EntitySchema<NotificationTemplate>({
  class: NotificationTemplate,
  tableName: "notification_templates",
  uniques: [
    {
      name: "notification_templates_tenant_key_channel_unique",
      properties: ["tenantId", "key", "channel"],
    },
  ],
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", nullable: true, type: "uuid" },
    key: { type: "text" },
    channel: {
      enum: true,
      items: () => NOTIFICATION_CHANNELS,
      nativeEnumName: "notification_channel",
    },
    subject: { type: "text" },
    body: { type: "text" },
    active: { type: "boolean" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
    updatedAt: { fieldName: "updated_at", type: "timestamptz" },
  },
});

export const NotificationDeliverySchema = new EntitySchema<NotificationDelivery>({
  class: NotificationDelivery,
  tableName: "notification_deliveries",
  indexes: [{ name: "notification_deliveries_notification_index", properties: ["notificationId"] }],
  properties: {
    id: { primary: true, type: "uuid" },
    notificationId: { fieldName: "notification_id", type: "uuid" },
    provider: { type: "text" },
    status: {
      enum: true,
      items: () => DELIVERY_STATUSES,
      nativeEnumName: "notification_delivery_status",
    },
    providerMessageId: { fieldName: "provider_message_id", nullable: true, type: "text" },
    error: { nullable: true, type: "text" },
    attempts: { type: "integer" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
    updatedAt: { fieldName: "updated_at", type: "timestamptz" },
  },
});

export const NOTIFICATION_SCHEMAS = [
  NotificationSchema,
  NotificationTemplateSchema,
  NotificationDeliverySchema,
] as const;

export class InvalidNotificationFieldError extends Error {
  constructor(field: string) {
    super(`Notification ${field} is invalid.`);
    this.name = "InvalidNotificationFieldError";
  }
}

function required(value: string, field: string): string {
  const result = value.trim();
  if (!result) throw new InvalidNotificationFieldError(field);
  return result;
}
function optional(value: string | null | undefined): string | null {
  const result = value?.trim();
  return result ? result : null;
}
function templateKey(value: string): string {
  const result = required(value, "templateKey").toLowerCase();
  if (!/^[a-z][a-z0-9_.-]*$/.test(result)) throw new InvalidNotificationFieldError("templateKey");
  return result;
}
