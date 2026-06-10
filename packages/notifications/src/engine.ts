import type { OrganizationId, TenantId, UserId } from "@tnvios/database/contracts";
import type { JobQueue } from "@tnvios/jobs";

import {
  Notification,
  NotificationDelivery,
  type NotificationChannel,
  NotificationTemplate,
} from "./entities.js";
import type { EmailProvider } from "./provider.js";
import { EmailTemplateRenderer } from "./templates.js";

export const DELIVER_EMAIL_JOB = "notification.email.deliver";

export interface NotificationRepository {
  create(entity: Notification): Promise<void>;
  save(entity: object): Promise<void>;
  findTemplate(
    tenantId: TenantId,
    key: string,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate | null>;
  findNotification(id: Notification["id"]): Promise<Notification | null>;
}

export interface CreateNotificationInput {
  readonly tenantId: TenantId;
  readonly organizationId?: OrganizationId | null;
  readonly userId: UserId;
  readonly templateKey: string;
  readonly channels: readonly NotificationChannel[];
  readonly variables: Record<string, string | number | boolean | null>;
  readonly recipient?: string | null;
  readonly metadata?: Record<string, unknown>;
}

export class NotificationEngine {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly jobs: JobQueue,
    private readonly renderer = new EmailTemplateRenderer(),
  ) {}

  async create(input: CreateNotificationInput): Promise<readonly Notification[]> {
    const notifications: Notification[] = [];
    for (const channel of new Set(input.channels)) {
      const template = await this.repository.findTemplate(
        input.tenantId,
        input.templateKey,
        channel,
      );
      if (!template?.active)
        throw new NotificationTemplateNotFoundError(input.templateKey, channel);
      if (channel === "email" && !input.recipient) throw new NotificationRecipientRequiredError();
      const rendered = this.renderer.render(template, input.variables);
      const notification = new Notification({
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        userId: input.userId,
        templateKey: input.templateKey,
        title: rendered.subject,
        message: rendered.body,
        channel,
        recipient: input.recipient,
        metadata: input.metadata,
      });
      await this.repository.create(notification);
      if (channel === "email") {
        await this.jobs.enqueue(DELIVER_EMAIL_JOB, { notificationId: notification.id });
      }
      notifications.push(notification);
    }
    return notifications;
  }

  async markRead(notification: Notification, at = new Date()): Promise<void> {
    if (notification.channel !== "in-app")
      throw new Error("Only in-app notifications can be read.");
    notification.markRead(at);
    await this.repository.save(notification);
  }
}

export class EmailNotificationDelivery {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly provider: EmailProvider,
    private readonly from: string,
  ) {}

  async deliver(notificationId: Notification["id"]): Promise<NotificationDelivery> {
    const notification = await this.repository.findNotification(notificationId);
    if (!notification || notification.channel !== "email" || !notification.recipient) {
      throw new Error("Deliverable email notification not found.");
    }
    const delivery = new NotificationDelivery({ notificationId, provider: this.provider.name });
    await this.repository.save(delivery);
    try {
      const result = await this.provider.sendEmail({
        from: this.from,
        to: notification.recipient,
        subject: notification.title,
        html: notification.message,
      });
      delivery.markSent(result.messageId);
      notification.markSent();
    } catch (error) {
      delivery.markFailed(error instanceof Error ? error.message : "Unknown provider error.");
      notification.markFailed();
      await this.repository.save(delivery);
      await this.repository.save(notification);
      throw error;
    }
    await this.repository.save(delivery);
    await this.repository.save(notification);
    return delivery;
  }
}

export class NotificationTemplateNotFoundError extends Error {
  constructor(key: string, channel: NotificationChannel) {
    super(`Active notification template "${key}" for channel "${channel}" was not found.`);
    this.name = "NotificationTemplateNotFoundError";
  }
}

export class NotificationRecipientRequiredError extends Error {
  constructor() {
    super("Email notifications require a recipient.");
    this.name = "NotificationRecipientRequiredError";
  }
}
