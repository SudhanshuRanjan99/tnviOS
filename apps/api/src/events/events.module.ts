import { Module } from "@nestjs/common";
import { AuditEventsPersistence } from "./audit-events.persistence.js";
import { EventsController, InternalEventsController } from "./events.controller.js";
import { ApiOutboxWorker } from "./outbox-worker.provider.js";
@Module({
  controllers: [EventsController, InternalEventsController],
  exports: [AuditEventsPersistence, ApiOutboxWorker],
  providers: [AuditEventsPersistence, ApiOutboxWorker],
})
export class EventsModule {}
