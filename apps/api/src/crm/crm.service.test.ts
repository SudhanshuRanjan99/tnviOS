import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import type { CrmPersistence } from "./crm.persistence.js";
import { CrmService } from "./crm.service.js";

const context = {
  tenantId: createEntityId<"tenant">(),
  organizationId: createEntityId<"organization">(),
  businessUnitId: null,
  departmentId: null,
  teamId: null,
  membershipId: createEntityId<"membership">(),
  userId: createEntityId<"user">(),
};

describe("CrmService", () => {
  it("rejects cross-organization customer references", async () => {
    const persistence = { find: vi.fn(async () => null), save: vi.fn() } as unknown as CrmPersistence;
    await expect(
      new CrmService(persistence).createContact(context, {
        customerId: createEntityId(),
        firstName: "Jane",
        lastName: "Doe",
      }),
    ).rejects.toMatchObject({ response: { code: "CRM_CUSTOMER_NOT_FOUND" } });
    expect(persistence.save).not.toHaveBeenCalled();
  });
});
