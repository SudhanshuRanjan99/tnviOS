import { Module } from "@nestjs/common";

import { EventsModule } from "../events/events.module.js";
import { ApiNotificationEngine } from "./notification-jobs.provider.js";
import {
  InternalNotificationsController,
  NotificationsController,
} from "./notifications.controller.js";
import { NotificationsPersistence } from "./notifications.persistence.js";
import { NotificationsService } from "./notifications.service.js";

@Module({
  imports: [EventsModule],
  controllers: [NotificationsController, InternalNotificationsController],
  providers: [ApiNotificationEngine, NotificationsPersistence, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
