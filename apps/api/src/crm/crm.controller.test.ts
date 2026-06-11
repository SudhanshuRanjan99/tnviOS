import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import { setResolvedOrganizationContext } from "../organization/resolved-context.js";
import { CrmController } from "./crm.controller.js";
import type { CrmService } from "./crm.service.js";

describe("CrmController", () => {
  it("creates customers in the resolved organization context", async () => {
    const crm = { createCustomer: vi.fn(async () => ({ id: "customer-id" })) } as unknown as CrmService;
    const context = { tenantId: createEntityId<"tenant">(), organizationId: createEntityId<"organization">(), businessUnitId: null, departmentId: null, teamId: null, membershipId: createEntityId<"membership">(), userId: createEntityId<"user">() };
    const request = {};
    setResolvedOrganizationContext(request, context);
    await new CrmController(crm).createCustomer(request, { name: "Acme" });
    expect(crm.createCustomer).toHaveBeenCalledWith(context, { name: "Acme" });
  });
});
