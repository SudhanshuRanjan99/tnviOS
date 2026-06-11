import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it } from "vitest";

import { CrmCustomer, CrmLead, CrmOpportunity, InvalidCrmTransitionError, crmEventDefinitions } from "./index.js";

const context = { tenantId: createEntityId<"tenant">(), organizationId: createEntityId<"organization">(), actorId: createEntityId<"user">() };

describe("CRM module", () => {
  it("normalizes customer fields and rejects invalid email", () => {
    expect(new CrmCustomer({ ...context, name: " Acme ", email: "SALES@ACME.COM" })).toMatchObject({ name: "Acme", email: "sales@acme.com" });
    expect(() => new CrmCustomer({ ...context, name: "Acme", email: "bad" })).toThrow();
  });
  it("enforces lead qualification before conversion", () => {
    const lead = new CrmLead({ ...context, name: "Jane" });
    expect(() => lead.convert(createEntityId(), context.actorId)).toThrow(InvalidCrmTransitionError);
    lead.qualify(context.actorId);
    lead.convert(createEntityId(), context.actorId);
    expect(lead.status).toBe("converted");
  });
  it("closes opportunities once and sets probability", () => {
    const opportunity = new CrmOpportunity({ ...context, customerId: createEntityId(), name: "Expansion", amount: 1000 });
    opportunity.close("won", context.actorId);
    expect(opportunity).toMatchObject({ stage: "won", probability: 100 });
    expect(() => opportunity.close("lost", context.actorId)).toThrow(InvalidCrmTransitionError);
  });
  it("registers documented CRM events", () => {
    expect(crmEventDefinitions.map(({ eventType }) => eventType)).toContain("crm.opportunity.closed");
  });
});
