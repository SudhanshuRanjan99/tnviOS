import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import { setResolvedOrganizationContext } from "../organization/resolved-context.js";
import type { AuditEventsPersistence } from "./audit-events.persistence.js";
import { EventsController, InternalEventsController } from "./events.controller.js";
import type { ApiOutboxWorker } from "./outbox-worker.provider.js";

describe("events controllers", () => {
  it("registers event definitions through persistence", async () => {
    const persistence = { save: vi.fn() } as unknown as AuditEventsPersistence;
    const response = await new EventsController(persistence).createDefinition({
      eventType: "crm.customer.created",
      publisher: "crm",
    });
    expect(response).toMatchObject({
      success: true,
      data: { eventType: "crm.customer.created", version: 1 },
    });
    expect(persistence.save).toHaveBeenCalledOnce();
  });

  it("scopes audit log reads to resolved tenant and organization", async () => {
    const persistence = { list: vi.fn(async () => []) } as unknown as AuditEventsPersistence;
    const request = {};
    const context = {
      tenantId: createEntityId<"tenant">(),
      organizationId: createEntityId<"organization">(),
      businessUnitId: null,
      departmentId: null,
      teamId: null,
      membershipId: createEntityId<"membership">(),
      userId: createEntityId<"user">(),
    };
    setResolvedOrganizationContext(request, context);
    await new EventsController(persistence).listAuditLogs(request);
    expect(persistence.list).toHaveBeenCalledWith(expect.any(Function), {
      tenantId: context.tenantId,
      organizationId: context.organizationId,
    });
  });

  it("runs an internal outbox batch", async () => {
    const worker = {
      runBatch: vi.fn(async () => ({ claimed: 2, published: 2, failed: 0 })),
    } as unknown as ApiOutboxWorker;
    await expect(new InternalEventsController(worker).process({ limit: 2 })).resolves.toMatchObject(
      {
        data: { claimed: 2, published: 2 },
      },
    );
  });
});
