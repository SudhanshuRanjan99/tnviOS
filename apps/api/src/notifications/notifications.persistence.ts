import { Injectable } from "@nestjs/common";
import { AuditLog } from "@tnvios/audit";
import type { TenantId } from "@tnvios/database/contracts";
import { OutboxEvent } from "@tnvios/events";
import {
  Notification,
  type NotificationChannel,
  type NotificationRepository,
  NotificationTemplate,
} from "@tnvios/notifications";

import { AuditEventsPersistence } from "../events/audit-events.persistence.js";

@Injectable()
export class NotificationsPersistence implements NotificationRepository {
  constructor(private readonly persistence: AuditEventsPersistence) {}

  async create(notification: Notification): Promise<void> {
    await this.persistence.recordMutation(
      notification,
      this.audit(notification, "notification.created"),
      this.event(notification, "notification.created"),
    );
  }

  save(entity: object): Promise<void> {
    return this.persistence.save(entity);
  }

  async saveRead(notification: Notification): Promise<void> {
    await this.persistence.recordMutation(
      notification,
      this.audit(notification, "notification.read"),
      this.event(notification, "notification.read"),
    );
  }

  async findTemplate(
    tenantId: TenantId,
    key: string,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate | null> {
    const templates = await this.persistence.list(NotificationTemplate, {
      key,
      channel,
      active: true,
    });
    return (
      templates.find((template) => template.tenantId === tenantId) ??
      templates.find((template) => template.tenantId === null) ??
      null
    );
  }

  async findNotification(id: Notification["id"]): Promise<Notification | null> {
    return (await this.persistence.list(Notification, { id }))[0] ?? null;
  }

  listInbox(
    tenantId: Notification["tenantId"],
    userId: Notification["userId"],
  ): Promise<Notification[]> {
    return this.persistence.list(Notification, { tenantId, userId, channel: "in-app" });
  }

  private audit(notification: Notification, action: string): AuditLog {
    return new AuditLog({
      tenantId: notification.tenantId,
      organizationId: notification.organizationId,
      userId: notification.userId,
      entityType: "notification",
      entityId: notification.id,
      action,
      newValues: {
        channel: notification.channel,
        status: notification.status,
        templateKey: notification.templateKey,
      },
    });
  }

  private event(notification: Notification, eventType: string): OutboxEvent {
    return new OutboxEvent({
      eventType,
      source: "notifications",
      tenantId: notification.tenantId,
      organizationId: notification.organizationId,
      userId: notification.userId,
      aggregateType: "notification",
      aggregateId: notification.id,
      payload: {
        notificationId: notification.id,
        channel: notification.channel,
        status: notification.status,
      },
    });
  }
}
