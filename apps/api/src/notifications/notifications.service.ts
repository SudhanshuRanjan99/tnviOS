import { Injectable } from "@nestjs/common";
import type { OrganizationId, TenantId, UserId } from "@tnvios/database/contracts";
import { Notification, NotificationTemplate } from "@tnvios/notifications";
import type { ResolvedOrganizationContext } from "@tnvios/organization";

import { ApiNotificationEngine } from "./notification-jobs.provider.js";
import type { CreateNotificationTemplateDto, SendNotificationDto } from "./notifications.dto.js";
import { NotificationsPersistence } from "./notifications.persistence.js";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly persistence: NotificationsPersistence,
    private readonly engine: ApiNotificationEngine,
  ) {}

  async send(input: SendNotificationDto) {
    return this.engine.get().create({
      ...input,
      tenantId: input.tenantId as TenantId,
      organizationId: input.organizationId as OrganizationId | undefined,
      userId: input.userId as UserId,
    });
  }

  async createTemplate(input: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    const template = new NotificationTemplate({
      ...input,
      tenantId: input.tenantId as TenantId | undefined,
    });
    await this.persistence.save(template);
    return template;
  }

  inbox(context: ResolvedOrganizationContext): Promise<Notification[]> {
    return this.persistence.listInbox(context.tenantId, context.userId);
  }

  async markRead(context: ResolvedOrganizationContext, id: string): Promise<Notification> {
    const notification = await this.persistence.findNotification(id as Notification["id"]);
    if (
      !notification ||
      notification.tenantId !== context.tenantId ||
      notification.userId !== context.userId
    ) {
      throw new Error("Notification not found.");
    }
    notification.markRead();
    await this.persistence.saveRead(notification);
    return notification;
  }
}
