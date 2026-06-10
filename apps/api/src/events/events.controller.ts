import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { AuditLog } from "@tnvios/audit";
import { EventDefinition } from "@tnvios/events";
import {
  SkipOrganizationContext,
  RequireOrganizationContext,
} from "../organization/context.decorator.js";
import { getResolvedOrganizationContext } from "../organization/resolved-context.js";
import { RequirePermission, SkipAuthorization } from "../policies/permission.decorator.js";
import { AuditEventsPersistence } from "./audit-events.persistence.js";
import { ProcessOutboxDto, RegisterEventDto } from "./events.dto.js";
import { ApiOutboxWorker } from "./outbox-worker.provider.js";

@Controller("events")
@RequireOrganizationContext()
export class EventsController {
  constructor(private readonly persistence: AuditEventsPersistence) {}
  @Get("registry") @RequirePermission("system.event.read") listRegistry() {
    return this.collection(this.persistence.list(EventDefinition));
  }
  @Post("registry") @RequirePermission("system.event.manage") createDefinition(
    @Body() body: RegisterEventDto,
  ) {
    return this.created(new EventDefinition(body));
  }
  @Get("audit-logs") @RequirePermission("system.audit.read") listAuditLogs(@Req() request: object) {
    const context = getResolvedOrganizationContext(request);
    if (!context) throw new Error("Resolved organization context required.");
    return this.collection(
      this.persistence.list(AuditLog, {
        tenantId: context.tenantId,
        organizationId: context.organizationId,
      }),
    );
  }
  private async created(entity: object) {
    await this.persistence.save(entity);
    return { success: true as const, data: entity, meta: {} };
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

@Controller("internal/v1/events")
@SkipOrganizationContext()
@SkipAuthorization()
export class InternalEventsController {
  constructor(private readonly worker: ApiOutboxWorker) {}
  @Post("outbox/process")
  async process(@Body() body: ProcessOutboxDto) {
    return { success: true as const, data: await this.worker.runBatch(body.limit), meta: {} };
  }
}
