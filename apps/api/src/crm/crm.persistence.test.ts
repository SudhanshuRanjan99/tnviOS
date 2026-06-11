import { CrmCustomer } from "@tnvios/crm";
import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import type { AuditEventsPersistence } from "../events/audit-events.persistence.js";
import { CrmPersistence } from "./crm.persistence.js";

describe("CrmPersistence", () => {
  it("records CRM mutations with audit and outbox events", async () => {
    const auditEvents = { recordMutation: vi.fn() } as unknown as AuditEventsPersistence;
    const persistence = new CrmPersistence(auditEvents);
    const customer = new CrmCustomer({
      tenantId: createEntityId(),
      organizationId: createEntityId(),
      actorId: createEntityId(),
      name: "Acme",
    });
    await persistence.save(customer);
    expect(auditEvents.recordMutation).toHaveBeenCalledWith(
      customer,
      expect.objectContaining({ entityType: "crm.customer", action: "created" }),
      expect.objectContaining({ eventType: "crm.customer.created", source: "crm" }),
    );
  });
});
