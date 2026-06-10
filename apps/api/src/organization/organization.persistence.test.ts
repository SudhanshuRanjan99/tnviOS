import { Tenant } from "@tnvios/organization";
import { describe, expect, it, vi } from "vitest";

import type { AuditEventsPersistence } from "../events/audit-events.persistence.js";
import { OrganizationPersistence } from "./organization.persistence.js";

describe("OrganizationPersistence", () => {
  it("writes organization mutations with audit and outbox records in one boundary", async () => {
    const auditEvents = { recordMutation: vi.fn() } as unknown as AuditEventsPersistence;
    const persistence = new OrganizationPersistence(auditEvents);
    const tenant = new Tenant({ name: "Acme", slug: "acme" });

    await persistence.save(tenant);

    expect(auditEvents.recordMutation).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({
        action: "created",
        entityId: tenant.id,
        entityType: "tenant",
        tenantId: tenant.id,
      }),
      expect.objectContaining({
        aggregateId: tenant.id,
        eventType: "organization.tenant.created",
        tenantId: tenant.id,
      }),
    );
  });
});
