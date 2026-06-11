import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";

import { getAuthenticatedIdentity } from "../auth/authenticated-request.js";
import { RequireOrganizationContext, SkipOrganizationContext } from "../organization/context.decorator.js";
import { getResolvedOrganizationContext } from "../organization/resolved-context.js";
import { RequirePermission, SkipAuthorization } from "../policies/permission.decorator.js";
import { CloseCrmOpportunityDto, CreateCrmActivityDto, CreateCrmContactDto, CreateCrmCustomerDto, CreateCrmLeadDto, CreateCrmOpportunityDto } from "./crm.dto.js";
import { CrmService } from "./crm.service.js";

@Controller("crm")
@RequireOrganizationContext()
export class CrmController {
  constructor(private readonly crm: CrmService) {}
  @Post("demo/bootstrap") @SkipOrganizationContext() @SkipAuthorization() async bootstrapLocalDemo(@Req() r: object) {
    const identity = getAuthenticatedIdentity(r);
    if (!identity) throw new Error("Authenticated identity required.");
    return this.item(this.crm.bootstrapLocalDemo(identity.userId));
  }
  @Get("customers") @RequirePermission("crm.customer.read") listCustomers(@Req() r: object) { return this.collection(this.crm.listCustomers(this.context(r))); }
  @Post("customers") @RequirePermission("crm.customer.create") createCustomer(@Req() r: object, @Body() b: CreateCrmCustomerDto) { return this.item(this.crm.createCustomer(this.context(r), b)); }
  @Get("contacts") @RequirePermission("crm.contact.read") listContacts(@Req() r: object) { return this.collection(this.crm.listContacts(this.context(r))); }
  @Post("contacts") @RequirePermission("crm.contact.create") createContact(@Req() r: object, @Body() b: CreateCrmContactDto) { return this.item(this.crm.createContact(this.context(r), b)); }
  @Get("leads") @RequirePermission("crm.lead.read") listLeads(@Req() r: object) { return this.collection(this.crm.listLeads(this.context(r))); }
  @Post("leads") @RequirePermission("crm.lead.create") createLead(@Req() r: object, @Body() b: CreateCrmLeadDto) { return this.item(this.crm.createLead(this.context(r), b)); }
  @Get("opportunities") @RequirePermission("crm.opportunity.read") listOpportunities(@Req() r: object) { return this.collection(this.crm.listOpportunities(this.context(r))); }
  @Post("opportunities") @RequirePermission("crm.opportunity.create") createOpportunity(@Req() r: object, @Body() b: CreateCrmOpportunityDto) { return this.item(this.crm.createOpportunity(this.context(r), b)); }
  @Post("opportunities/:id/close") @RequirePermission("crm.opportunity.close") closeOpportunity(@Req() r: object, @Param("id") id: string, @Body() b: CloseCrmOpportunityDto) { return this.item(this.crm.closeOpportunity(this.context(r), id, b)); }
  @Get("activities") @RequirePermission("crm.activity.read") listActivities(@Req() r: object) { return this.collection(this.crm.listActivities(this.context(r))); }
  @Post("activities") @RequirePermission("crm.activity.create") createActivity(@Req() r: object, @Body() b: CreateCrmActivityDto) { return this.item(this.crm.createActivity(this.context(r), b)); }
  private context(request: object) { const context = getResolvedOrganizationContext(request); if (!context) throw new Error("Resolved organization context required."); return context; }
  private async item<Entity>(entity: Promise<Entity>) { return { success: true as const, data: await entity, meta: {} }; }
  private async collection<Entity>(entities: Promise<Entity[]>) { const data = await entities; return { success: true as const, data, meta: { page: 1, pageSize: data.length, total: data.length } }; }
}
