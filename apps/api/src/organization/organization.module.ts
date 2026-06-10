import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { EventsModule } from "../events/events.module.js";
import { OrganizationContextGuard } from "./organization-context.guard.js";
import { OrganizationController } from "./organization.controller.js";
import { OrganizationPersistence } from "./organization.persistence.js";

@Module({
  imports: [EventsModule],
  controllers: [OrganizationController],
  exports: [OrganizationPersistence],
  providers: [OrganizationPersistence, { provide: APP_GUARD, useClass: OrganizationContextGuard }],
})
export class OrganizationModule {}
