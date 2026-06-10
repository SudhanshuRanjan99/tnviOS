import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";

import {
  RequireOrganizationContext,
  SkipOrganizationContext,
} from "../organization/context.decorator.js";
import { getResolvedOrganizationContext } from "../organization/resolved-context.js";
import { RequirePermission, SkipAuthorization } from "../policies/permission.decorator.js";
import { CreateNotificationTemplateDto, SendNotificationDto } from "./notifications.dto.js";
import { NotificationsService } from "./notifications.service.js";

@Controller("notifications")
@RequireOrganizationContext()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("inbox")
  @RequirePermission("system.notification.read")
  async inbox(@Req() request: object) {
    return this.collection(this.notifications.inbox(this.context(request)));
  }

  @Patch(":id/read")
  @RequirePermission("system.notification.read")
  async markRead(@Req() request: object, @Param("id") id: string) {
    return this.item(this.notifications.markRead(this.context(request), id));
  }

  @Post("templates")
  @RequirePermission("system.notification.manage")
  async createTemplate(@Body() body: CreateNotificationTemplateDto) {
    return this.item(this.notifications.createTemplate(body));
  }

  private context(request: object) {
    const context = getResolvedOrganizationContext(request);
    if (!context) throw new Error("Resolved organization context required.");
    return context;
  }

  private async item<Entity>(entity: Promise<Entity>) {
    return { success: true as const, data: await entity, meta: {} };
  }

  private async collection<Entity>(entities: Promise<Entity[]>) {
    const data = await entities;
    return {
      success: true as const,
      data,
      meta: { page: 1, pageSize: data.length, total: data.length },
    };
  }
}

@Controller("internal/v1/notifications")
@SkipOrganizationContext()
@SkipAuthorization()
export class InternalNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  async send(@Body() body: SendNotificationDto) {
    return { success: true as const, data: await this.notifications.send(body), meta: {} };
  }
}
