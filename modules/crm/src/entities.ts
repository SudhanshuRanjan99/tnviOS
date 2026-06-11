import { EntitySchema } from "@mikro-orm/core";
import type { OrganizationId, TenantId, UserId } from "@tnvios/database/contracts";
import { createEntityId, type EntityId } from "@tnvios/database/identifiers";

export const CRM_CUSTOMER_STATUSES = ["prospect", "active", "inactive"] as const;
export const CRM_LEAD_STATUSES = ["new", "contacted", "qualified", "disqualified", "converted"] as const;
export const CRM_OPPORTUNITY_STAGES = ["discovery", "proposal", "negotiation", "won", "lost"] as const;
export const CRM_ACTIVITY_TYPES = ["call", "email", "meeting", "task", "note"] as const;
export const CRM_ACTIVITY_STATUSES = ["planned", "completed", "cancelled"] as const;

export type CrmCustomerStatus = (typeof CRM_CUSTOMER_STATUSES)[number];
export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number];
export type CrmOpportunityStage = (typeof CRM_OPPORTUNITY_STAGES)[number];
export type CrmActivityType = (typeof CRM_ACTIVITY_TYPES)[number];
export type CrmActivityStatus = (typeof CRM_ACTIVITY_STATUSES)[number];

abstract class CrmEntity {
  tenantId: TenantId;
  organizationId: OrganizationId;
  createdAt = new Date();
  updatedAt = new Date();
  deletedAt: Date | null = null;
  createdBy: UserId;
  updatedBy: UserId;
  deletedBy: UserId | null = null;

  constructor(context: { tenantId: TenantId; organizationId: OrganizationId; actorId: UserId }) {
    this.tenantId = context.tenantId;
    this.organizationId = context.organizationId;
    this.createdBy = context.actorId;
    this.updatedBy = context.actorId;
  }
}

export class CrmCustomer extends CrmEntity {
  id: EntityId<"crm_customer"> = createEntityId<"crm_customer">();
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  ownerUserId: UserId | null;
  status: CrmCustomerStatus = "prospect";

  constructor(input: CrmContext & {
    name: string; email?: string | null; phone?: string | null; website?: string | null;
    industry?: string | null; ownerUserId?: UserId | null;
  }) {
    super(input);
    this.name = required(input.name, "customer name");
    this.email = email(input.email);
    this.phone = optional(input.phone);
    this.website = optional(input.website);
    this.industry = optional(input.industry);
    this.ownerUserId = input.ownerUserId ?? null;
  }
}

export class CrmContact extends CrmEntity {
  id: EntityId<"crm_contact"> = createEntityId<"crm_contact">();
  customerId: EntityId<"crm_customer">;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  primary = false;

  constructor(input: CrmContext & {
    customerId: EntityId<"crm_customer">; firstName: string; lastName: string;
    email?: string | null; phone?: string | null; jobTitle?: string | null; primary?: boolean;
  }) {
    super(input);
    this.customerId = input.customerId;
    this.firstName = required(input.firstName, "contact firstName");
    this.lastName = required(input.lastName, "contact lastName");
    this.email = email(input.email);
    this.phone = optional(input.phone);
    this.jobTitle = optional(input.jobTitle);
    this.primary = input.primary ?? false;
  }
}

export class CrmLead extends CrmEntity {
  id: EntityId<"crm_lead"> = createEntityId<"crm_lead">();
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  estimatedValue: number;
  assignedTo: UserId | null;
  status: CrmLeadStatus = "new";
  convertedCustomerId: EntityId<"crm_customer"> | null = null;

  constructor(input: CrmContext & {
    name: string; company?: string | null; email?: string | null; phone?: string | null;
    source?: string | null; estimatedValue?: number; assignedTo?: UserId | null;
  }) {
    super(input);
    this.name = required(input.name, "lead name");
    this.company = optional(input.company);
    this.email = email(input.email);
    this.phone = optional(input.phone);
    this.source = optional(input.source);
    this.estimatedValue = money(input.estimatedValue ?? 0, "lead estimatedValue");
    this.assignedTo = input.assignedTo ?? null;
  }

  qualify(actorId: UserId, at = new Date()): void {
    if (!["new", "contacted"].includes(this.status)) throw new InvalidCrmTransitionError("lead", this.status, "qualified");
    this.status = "qualified";
    this.touch(actorId, at);
  }

  convert(customerId: EntityId<"crm_customer">, actorId: UserId, at = new Date()): void {
    if (this.status !== "qualified") throw new InvalidCrmTransitionError("lead", this.status, "converted");
    this.status = "converted";
    this.convertedCustomerId = customerId;
    this.touch(actorId, at);
  }

  private touch(actorId: UserId, at: Date) {
    this.updatedBy = actorId;
    this.updatedAt = at;
  }
}

export class CrmOpportunity extends CrmEntity {
  id: EntityId<"crm_opportunity"> = createEntityId<"crm_opportunity">();
  customerId: EntityId<"crm_customer">;
  leadId: EntityId<"crm_lead"> | null;
  name: string;
  stage: CrmOpportunityStage = "discovery";
  amount: number;
  probability: number;
  expectedCloseDate: Date | null;
  ownerUserId: UserId | null;
  closedAt: Date | null = null;

  constructor(input: CrmContext & {
    customerId: EntityId<"crm_customer">; leadId?: EntityId<"crm_lead"> | null; name: string;
    amount: number; probability?: number; expectedCloseDate?: Date | null; ownerUserId?: UserId | null;
  }) {
    super(input);
    this.customerId = input.customerId;
    this.leadId = input.leadId ?? null;
    this.name = required(input.name, "opportunity name");
    this.amount = money(input.amount, "opportunity amount");
    this.probability = percentage(input.probability ?? 0);
    this.expectedCloseDate = input.expectedCloseDate ?? null;
    this.ownerUserId = input.ownerUserId ?? null;
  }

  moveTo(stage: Exclude<CrmOpportunityStage, "won" | "lost">, actorId: UserId, at = new Date()): void {
    if (this.closedAt) throw new InvalidCrmTransitionError("opportunity", this.stage, stage);
    this.stage = stage;
    this.updatedBy = actorId;
    this.updatedAt = at;
  }

  close(outcome: "won" | "lost", actorId: UserId, at = new Date()): void {
    if (this.closedAt) throw new InvalidCrmTransitionError("opportunity", this.stage, outcome);
    this.stage = outcome;
    this.probability = outcome === "won" ? 100 : 0;
    this.closedAt = at;
    this.updatedBy = actorId;
    this.updatedAt = at;
  }
}

export class CrmActivity extends CrmEntity {
  id: EntityId<"crm_activity"> = createEntityId<"crm_activity">();
  subject: string;
  type: CrmActivityType;
  status: CrmActivityStatus = "planned";
  entityType: "customer" | "contact" | "lead" | "opportunity";
  entityId: EntityId;
  assignedTo: UserId | null;
  dueAt: Date | null;
  completedAt: Date | null = null;
  notes: string | null;

  constructor(input: CrmContext & {
    subject: string; type: CrmActivityType; entityType: CrmActivity["entityType"]; entityId: EntityId;
    assignedTo?: UserId | null; dueAt?: Date | null; notes?: string | null;
  }) {
    super(input);
    this.subject = required(input.subject, "activity subject");
    this.type = input.type;
    this.entityType = input.entityType;
    this.entityId = input.entityId;
    this.assignedTo = input.assignedTo ?? null;
    this.dueAt = input.dueAt ?? null;
    this.notes = optional(input.notes);
  }

  complete(actorId: UserId, at = new Date()): void {
    if (this.status !== "planned") throw new InvalidCrmTransitionError("activity", this.status, "completed");
    this.status = "completed";
    this.completedAt = at;
    this.updatedBy = actorId;
    this.updatedAt = at;
  }
}

interface CrmContext { tenantId: TenantId; organizationId: OrganizationId; actorId: UserId }
const auditProperties = {
  tenantId: { fieldName: "tenant_id", type: "uuid" },
  organizationId: { fieldName: "organization_id", type: "uuid" },
  createdAt: { fieldName: "created_at", type: "timestamptz" },
  updatedAt: { fieldName: "updated_at", type: "timestamptz" },
  deletedAt: { fieldName: "deleted_at", nullable: true, type: "timestamptz" },
  createdBy: { fieldName: "created_by", type: "uuid" },
  updatedBy: { fieldName: "updated_by", type: "uuid" },
  deletedBy: { fieldName: "deleted_by", nullable: true, type: "uuid" },
} as const;
const id = { primary: true, type: "uuid" } as const;
const textNullable = { nullable: true, type: "text" } as const;
const contextIndex = (name: string) => [{ name: `${name}_context_index`, properties: ["tenantId", "organizationId"] }] as never;

export const CrmCustomerSchema = new EntitySchema<CrmCustomer>({ class: CrmCustomer, tableName: "crm_customers", properties: {
  id, ...auditProperties, name: { type: "text" }, email: textNullable, phone: textNullable, website: textNullable,
  industry: textNullable, ownerUserId: { fieldName: "owner_user_id", nullable: true, type: "uuid" },
  status: { enum: true, items: () => CRM_CUSTOMER_STATUSES, nativeEnumName: "crm_customer_status" },
}, indexes: contextIndex("crm_customers") });
export const CrmContactSchema = new EntitySchema<CrmContact>({ class: CrmContact, tableName: "crm_contacts", properties: {
  id, ...auditProperties, customerId: { fieldName: "customer_id", type: "uuid" }, firstName: { fieldName: "first_name", type: "text" },
  lastName: { fieldName: "last_name", type: "text" }, email: textNullable, phone: textNullable,
  jobTitle: { fieldName: "job_title", ...textNullable }, primary: { type: "boolean" },
}, indexes: contextIndex("crm_contacts") });
export const CrmLeadSchema = new EntitySchema<CrmLead>({ class: CrmLead, tableName: "crm_leads", properties: {
  id, ...auditProperties, name: { type: "text" }, company: textNullable, email: textNullable, phone: textNullable, source: textNullable,
  estimatedValue: { fieldName: "estimated_value", type: "decimal" }, assignedTo: { fieldName: "assigned_to", nullable: true, type: "uuid" },
  status: { enum: true, items: () => CRM_LEAD_STATUSES, nativeEnumName: "crm_lead_status" },
  convertedCustomerId: { fieldName: "converted_customer_id", nullable: true, type: "uuid" },
}, indexes: contextIndex("crm_leads") });
export const CrmOpportunitySchema = new EntitySchema<CrmOpportunity>({ class: CrmOpportunity, tableName: "crm_opportunities", properties: {
  id, ...auditProperties, customerId: { fieldName: "customer_id", type: "uuid" }, leadId: { fieldName: "lead_id", nullable: true, type: "uuid" },
  name: { type: "text" }, stage: { enum: true, items: () => CRM_OPPORTUNITY_STAGES, nativeEnumName: "crm_opportunity_stage" },
  amount: { type: "decimal" }, probability: { type: "integer" }, expectedCloseDate: { fieldName: "expected_close_date", nullable: true, type: "timestamptz" },
  ownerUserId: { fieldName: "owner_user_id", nullable: true, type: "uuid" }, closedAt: { fieldName: "closed_at", nullable: true, type: "timestamptz" },
}, indexes: contextIndex("crm_opportunities") });
export const CrmActivitySchema = new EntitySchema<CrmActivity>({ class: CrmActivity, tableName: "crm_activities", properties: {
  id, ...auditProperties, subject: { type: "text" }, type: { enum: true, items: () => CRM_ACTIVITY_TYPES, nativeEnumName: "crm_activity_type" },
  status: { enum: true, items: () => CRM_ACTIVITY_STATUSES, nativeEnumName: "crm_activity_status" },
  entityType: { fieldName: "entity_type", type: "text" }, entityId: { fieldName: "entity_id", type: "uuid" },
  assignedTo: { fieldName: "assigned_to", nullable: true, type: "uuid" }, dueAt: { fieldName: "due_at", nullable: true, type: "timestamptz" },
  completedAt: { fieldName: "completed_at", nullable: true, type: "timestamptz" }, notes: textNullable,
}, indexes: contextIndex("crm_activities") });

export const CRM_SCHEMAS = [CrmCustomerSchema, CrmContactSchema, CrmLeadSchema, CrmOpportunitySchema, CrmActivitySchema] as const;

export class InvalidCrmFieldError extends Error {
  constructor(field: string) { super(`CRM ${field} is invalid.`); this.name = "InvalidCrmFieldError"; }
}
export class InvalidCrmTransitionError extends Error {
  constructor(entity: string, from: string, to: string) { super(`CRM ${entity} cannot transition from ${from} to ${to}.`); this.name = "InvalidCrmTransitionError"; }
}
function required(value: string, field: string): string { const result = value.trim(); if (!result) throw new InvalidCrmFieldError(field); return result; }
function optional(value: string | null | undefined): string | null { const result = value?.trim(); return result || null; }
function email(value: string | null | undefined): string | null { const result = optional(value)?.toLowerCase() ?? null; if (result && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(result)) throw new InvalidCrmFieldError("email"); return result; }
function money(value: number, field: string): number { if (!Number.isFinite(value) || value < 0) throw new InvalidCrmFieldError(field); return value; }
function percentage(value: number): number { if (!Number.isInteger(value) || value < 0 || value > 100) throw new InvalidCrmFieldError("opportunity probability"); return value; }
