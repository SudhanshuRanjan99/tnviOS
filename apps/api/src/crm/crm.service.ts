import { Injectable, NotFoundException } from "@nestjs/common";
import { CrmActivity, CrmContact, CrmCustomer, CrmLead, CrmOpportunity } from "@tnvios/crm";
import { parseEntityId } from "@tnvios/database/identifiers";
import type { ResolvedOrganizationContext } from "@tnvios/organization";
import type { UserId } from "@tnvios/database/contracts";

import type { CloseCrmOpportunityDto, CreateCrmActivityDto, CreateCrmContactDto, CreateCrmCustomerDto, CreateCrmLeadDto, CreateCrmOpportunityDto } from "./crm.dto.js";
import { CrmPersistence } from "./crm.persistence.js";

@Injectable()
export class CrmService {
  constructor(private readonly persistence: CrmPersistence) {}
  bootstrapLocalDemo(userId: UserId) { return this.persistence.bootstrapLocalDemo(userId); }
  listCustomers(c: ResolvedOrganizationContext) { return this.persistence.list(CrmCustomer, c.tenantId, c.organizationId); }
  listContacts(c: ResolvedOrganizationContext) { return this.persistence.list(CrmContact, c.tenantId, c.organizationId); }
  listLeads(c: ResolvedOrganizationContext) { return this.persistence.list(CrmLead, c.tenantId, c.organizationId); }
  listOpportunities(c: ResolvedOrganizationContext) { return this.persistence.list(CrmOpportunity, c.tenantId, c.organizationId); }
  listActivities(c: ResolvedOrganizationContext) { return this.persistence.list(CrmActivity, c.tenantId, c.organizationId); }
  createCustomer(c: ResolvedOrganizationContext, d: CreateCrmCustomerDto) { return this.created(new CrmCustomer({ ...this.context(c), ...d, ownerUserId: d.ownerUserId ? parseEntityId<"user">(d.ownerUserId) : null })); }
  async createContact(c: ResolvedOrganizationContext, d: CreateCrmContactDto) {
    const customerId = parseEntityId<"crm_customer">(d.customerId);
    await this.requireReference(CrmCustomer, customerId, c, "CRM_CUSTOMER_NOT_FOUND");
    return this.created(new CrmContact({ ...this.context(c), ...d, customerId }));
  }
  createLead(c: ResolvedOrganizationContext, d: CreateCrmLeadDto) { return this.created(new CrmLead({ ...this.context(c), ...d, assignedTo: d.assignedTo ? parseEntityId<"user">(d.assignedTo) : null })); }
  async createOpportunity(c: ResolvedOrganizationContext, d: CreateCrmOpportunityDto) {
    const customerId = parseEntityId<"crm_customer">(d.customerId);
    const leadId = d.leadId ? parseEntityId<"crm_lead">(d.leadId) : null;
    await this.requireReference(CrmCustomer, customerId, c, "CRM_CUSTOMER_NOT_FOUND");
    if (leadId) await this.requireReference(CrmLead, leadId, c, "CRM_LEAD_NOT_FOUND");
    return this.created(new CrmOpportunity({ ...this.context(c), ...d, customerId, leadId, ownerUserId: d.ownerUserId ? parseEntityId<"user">(d.ownerUserId) : null }));
  }
  async createActivity(c: ResolvedOrganizationContext, d: CreateCrmActivityDto) {
    const entityId = parseEntityId(d.entityId);
    if (d.entityType === "customer")
      await this.requireReference(CrmCustomer, entityId, c, "CRM_ACTIVITY_TARGET_NOT_FOUND");
    if (d.entityType === "contact")
      await this.requireReference(CrmContact, entityId, c, "CRM_ACTIVITY_TARGET_NOT_FOUND");
    if (d.entityType === "lead")
      await this.requireReference(CrmLead, entityId, c, "CRM_ACTIVITY_TARGET_NOT_FOUND");
    if (d.entityType === "opportunity")
      await this.requireReference(CrmOpportunity, entityId, c, "CRM_ACTIVITY_TARGET_NOT_FOUND");
    return this.created(new CrmActivity({ ...this.context(c), ...d, entityId, assignedTo: d.assignedTo ? parseEntityId<"user">(d.assignedTo) : null }));
  }
  async closeOpportunity(c: ResolvedOrganizationContext, id: string, d: CloseCrmOpportunityDto) {
    const opportunity = await this.persistence.find(CrmOpportunity, parseEntityId(id), c.tenantId, c.organizationId);
    if (!opportunity) throw new NotFoundException({ code: "CRM_OPPORTUNITY_NOT_FOUND", message: "Opportunity was not found." });
    opportunity.close(d.outcome, c.userId);
    await this.persistence.save(opportunity, "crm.opportunity.closed");
    return opportunity;
  }
  private context(c: ResolvedOrganizationContext) { return { tenantId: c.tenantId, organizationId: c.organizationId, actorId: c.userId }; }
  private async created<Entity extends Parameters<CrmPersistence["save"]>[0]>(entity: Entity): Promise<Entity> { await this.persistence.save(entity); return entity; }
  private async requireReference<Entity extends Parameters<CrmPersistence["save"]>[0]>(
    type: { new (...args: never[]): Entity },
    id: Parameters<CrmPersistence["find"]>[1],
    context: ResolvedOrganizationContext,
    code: string,
  ): Promise<Entity> {
    const entity = await this.persistence.find(type, id, context.tenantId, context.organizationId);
    if (!entity) throw new NotFoundException({ code, message: "CRM reference was not found in this organization." });
    return entity;
  }
}
