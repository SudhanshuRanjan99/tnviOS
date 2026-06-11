import { EventDefinition } from "@tnvios/events";

export const crmPermissions = [
  "crm.customer.read", "crm.customer.create", "crm.contact.read", "crm.contact.create",
  "crm.lead.read", "crm.lead.create", "crm.opportunity.read", "crm.opportunity.create",
  "crm.opportunity.close", "crm.activity.read", "crm.activity.create",
] as const;

export const crmEventDefinitions = [
  "crm.customer.created", "crm.customer.updated", "crm.customer.deleted",
  "crm.contact.created", "crm.lead.created", "crm.lead.updated",
  "crm.opportunity.created", "crm.opportunity.closed", "crm.activity.created",
].map((eventType) => new EventDefinition({ eventType, publisher: "crm" }));

export const crmSearchEntities = [
  { entityType: "crm.customer", permissionCode: "crm.customer.read", fields: ["name", "email", "industry"] },
  { entityType: "crm.contact", permissionCode: "crm.contact.read", fields: ["firstName", "lastName", "email"] },
  { entityType: "crm.lead", permissionCode: "crm.lead.read", fields: ["name", "company", "email", "source"] },
  { entityType: "crm.opportunity", permissionCode: "crm.opportunity.read", fields: ["name", "stage"] },
] as const;

export const crmDataExchangeTemplates = [
  { key: "crm.customer", fields: ["name", "email", "phone", "website", "industry", "status"] },
  { key: "crm.contact", fields: ["customerId", "firstName", "lastName", "email", "phone", "jobTitle"] },
  { key: "crm.lead", fields: ["name", "company", "email", "phone", "source", "estimatedValue", "status"] },
  { key: "crm.opportunity", fields: ["customerId", "name", "stage", "amount", "probability", "expectedCloseDate"] },
] as const;
