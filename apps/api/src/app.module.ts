import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { HealthModule } from "./health/health.module.js";
import { EventsModule } from "./events/events.module.js";
import { FilesModule } from "./files/files.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { OrganizationModule } from "./organization/organization.module.js";
import { PolicyModule } from "./policies/policy.module.js";
import { RequestContextModule } from "./request-context/request-context.module.js";

@Module({
  imports: [
    AuthModule,
    EventsModule,
    FilesModule,
    HealthModule,
    NotificationsModule,
    OrganizationModule,
    PolicyModule,
    RequestContextModule,
  ],
})
export class AppModule {}
