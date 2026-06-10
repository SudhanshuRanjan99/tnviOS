import { EntitySchema } from "@mikro-orm/core";
import type {
  BusinessUnitId,
  DepartmentId,
  GroupId,
  MembershipId,
  OrganizationId,
  TeamId,
  TenantId,
  UserId,
} from "@tnvios/database/contracts";
import { createEntityId } from "@tnvios/database/identifiers";

export const ORGANIZATION_STATUSES = ["active", "inactive"] as const;
export const MEMBER_TYPES = [
  "employee",
  "contractor",
  "consultant",
  "intern",
  "executive",
] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];
export type MemberType = (typeof MEMBER_TYPES)[number];

abstract class AuditedEntity {
  createdAt = new Date();
  updatedAt = new Date();
  deletedAt: Date | null = null;
  createdBy: UserId | null = null;
  updatedBy: UserId | null = null;
  deletedBy: UserId | null = null;
}

export class Tenant extends AuditedEntity {
  id: TenantId = createEntityId<"tenant">();
  name: string;
  slug: string;
  status: OrganizationStatus = "active";
  subscriptionPlan: string | null = null;

  constructor(input: { name: string; slug: string; subscriptionPlan?: string | null }) {
    super();
    this.name = required(input.name, "name");
    this.slug = slug(input.slug);
    this.subscriptionPlan = optional(input.subscriptionPlan);
  }
}

export class Group extends AuditedEntity {
  id: GroupId = createEntityId<"group">();
  tenantId: TenantId;
  name: string;
  legalName: string | null = null;
  status: OrganizationStatus = "active";

  constructor(input: { tenantId: TenantId; name: string; legalName?: string | null }) {
    super();
    this.tenantId = input.tenantId;
    this.name = required(input.name, "name");
    this.legalName = optional(input.legalName);
  }
}

export class Organization extends AuditedEntity {
  id: OrganizationId = createEntityId<"organization">();
  tenantId: TenantId;
  groupId: GroupId | null = null;
  name: string;
  legalName: string | null = null;
  registrationNumber: string | null = null;
  country: string;
  currency: string;
  status: OrganizationStatus = "active";

  constructor(input: {
    tenantId: TenantId;
    groupId?: GroupId | null;
    name: string;
    legalName?: string | null;
    registrationNumber?: string | null;
    country: string;
    currency: string;
  }) {
    super();
    this.tenantId = input.tenantId;
    this.groupId = input.groupId ?? null;
    this.name = required(input.name, "name");
    this.legalName = optional(input.legalName);
    this.registrationNumber = optional(input.registrationNumber);
    this.country = code(input.country, "country", 2);
    this.currency = code(input.currency, "currency", 3);
  }
}

export class BusinessUnit extends AuditedEntity {
  id: BusinessUnitId = createEntityId<"business_unit">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  parentUnitId: BusinessUnitId | null = null;
  name: string;
  code: string;
  description: string | null = null;
  status: OrganizationStatus = "active";

  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    parentUnitId?: BusinessUnitId | null;
    name: string;
    code: string;
    description?: string | null;
  }) {
    super();
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.parentUnitId = input.parentUnitId ?? null;
    this.name = required(input.name, "name");
    this.code = code(input.code, "code");
    this.description = optional(input.description);
  }
}

export class Department extends AuditedEntity {
  id: DepartmentId = createEntityId<"department">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  businessUnitId: BusinessUnitId;
  name: string;
  code: string;
  headUserId: UserId | null = null;
  status: OrganizationStatus = "active";

  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    businessUnitId: BusinessUnitId;
    name: string;
    code: string;
    headUserId?: UserId | null;
  }) {
    super();
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.businessUnitId = input.businessUnitId;
    this.name = required(input.name, "name");
    this.code = code(input.code, "code");
    this.headUserId = input.headUserId ?? null;
  }
}

export class Team extends AuditedEntity {
  id: TeamId = createEntityId<"team">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  departmentId: DepartmentId;
  name: string;
  teamLeadUserId: UserId | null = null;
  status: OrganizationStatus = "active";

  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    departmentId: DepartmentId;
    name: string;
    teamLeadUserId?: UserId | null;
  }) {
    super();
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.departmentId = input.departmentId;
    this.name = required(input.name, "name");
    this.teamLeadUserId = input.teamLeadUserId ?? null;
  }
}

export class Membership extends AuditedEntity {
  id: MembershipId = createEntityId<"membership">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  userId: UserId;
  businessUnitId: BusinessUnitId | null = null;
  departmentId: DepartmentId | null = null;
  teamId: TeamId | null = null;
  memberType: MemberType;
  status: OrganizationStatus = "active";
  joinedAt: Date | null = null;

  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    userId: UserId;
    businessUnitId?: BusinessUnitId | null;
    departmentId?: DepartmentId | null;
    teamId?: TeamId | null;
    memberType: MemberType;
    joinedAt?: Date | null;
  }) {
    super();
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.userId = input.userId;
    this.businessUnitId = input.businessUnitId ?? null;
    this.departmentId = input.departmentId ?? null;
    this.teamId = input.teamId ?? null;
    this.memberType = input.memberType;
    this.joinedAt = input.joinedAt ?? null;
  }
}

const auditProperties = {
  createdAt: { fieldName: "created_at", type: "timestamptz" },
  updatedAt: { fieldName: "updated_at", onUpdate: () => new Date(), type: "timestamptz" },
  deletedAt: { fieldName: "deleted_at", nullable: true, type: "timestamptz" },
  createdBy: { fieldName: "created_by", nullable: true, type: "uuid" },
  updatedBy: { fieldName: "updated_by", nullable: true, type: "uuid" },
  deletedBy: { fieldName: "deleted_by", nullable: true, type: "uuid" },
} as const;
const statusProperty = {
  enum: true,
  items: () => ORGANIZATION_STATUSES,
  nativeEnumName: "organization_status",
} as const;

export const TenantSchema = new EntitySchema<Tenant>({
  class: Tenant,
  tableName: "tenants",
  properties: {
    id: { primary: true, type: "uuid" },
    name: { type: "text" },
    slug: { type: "text", unique: "tenants_slug_unique" },
    status: statusProperty,
    subscriptionPlan: { fieldName: "subscription_plan", nullable: true, type: "text" },
    ...auditProperties,
  },
});
export const GroupSchema = new EntitySchema<Group>({
  class: Group,
  tableName: "groups",
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    name: { type: "text" },
    legalName: { fieldName: "legal_name", nullable: true, type: "text" },
    status: statusProperty,
    ...auditProperties,
  },
  indexes: [{ name: "groups_tenant_id_index", properties: ["tenantId"] }],
});
export const OrganizationSchema = new EntitySchema<Organization>({
  class: Organization,
  tableName: "organizations",
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    groupId: { fieldName: "group_id", nullable: true, type: "uuid" },
    name: { type: "text" },
    legalName: { fieldName: "legal_name", nullable: true, type: "text" },
    registrationNumber: { fieldName: "registration_number", nullable: true, type: "text" },
    country: { type: "text" },
    currency: { type: "text" },
    status: statusProperty,
    ...auditProperties,
  },
  indexes: [{ name: "organizations_tenant_id_index", properties: ["tenantId"] }],
});
export const BusinessUnitSchema = new EntitySchema<BusinessUnit>({
  class: BusinessUnit,
  tableName: "business_units",
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    organizationId: { fieldName: "organization_id", type: "uuid" },
    parentUnitId: { fieldName: "parent_unit_id", nullable: true, type: "uuid" },
    name: { type: "text" },
    code: { type: "text" },
    description: { nullable: true, type: "text" },
    status: statusProperty,
    ...auditProperties,
  },
  uniques: [
    { name: "business_units_organization_code_unique", properties: ["organizationId", "code"] },
  ],
});
export const DepartmentSchema = new EntitySchema<Department>({
  class: Department,
  tableName: "departments",
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    organizationId: { fieldName: "organization_id", type: "uuid" },
    businessUnitId: { fieldName: "business_unit_id", type: "uuid" },
    name: { type: "text" },
    code: { type: "text" },
    headUserId: { fieldName: "head_user_id", nullable: true, type: "uuid" },
    status: statusProperty,
    ...auditProperties,
  },
  uniques: [
    { name: "departments_organization_code_unique", properties: ["organizationId", "code"] },
  ],
});
export const TeamSchema = new EntitySchema<Team>({
  class: Team,
  tableName: "teams",
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    organizationId: { fieldName: "organization_id", type: "uuid" },
    departmentId: { fieldName: "department_id", type: "uuid" },
    name: { type: "text" },
    teamLeadUserId: { fieldName: "team_lead_user_id", nullable: true, type: "uuid" },
    status: statusProperty,
    ...auditProperties,
  },
});
export const MembershipSchema = new EntitySchema<Membership>({
  class: Membership,
  tableName: "memberships",
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    organizationId: { fieldName: "organization_id", type: "uuid" },
    userId: { fieldName: "user_id", type: "uuid" },
    businessUnitId: { fieldName: "business_unit_id", nullable: true, type: "uuid" },
    departmentId: { fieldName: "department_id", nullable: true, type: "uuid" },
    teamId: { fieldName: "team_id", nullable: true, type: "uuid" },
    memberType: {
      enum: true,
      fieldName: "member_type",
      items: () => MEMBER_TYPES,
      nativeEnumName: "member_type",
    },
    status: statusProperty,
    joinedAt: { fieldName: "joined_at", nullable: true, type: "timestamptz" },
    ...auditProperties,
  },
  indexes: [
    { name: "memberships_user_id_index", properties: ["userId"] },
    { name: "memberships_tenant_organization_index", properties: ["tenantId", "organizationId"] },
    { name: "memberships_status_index", properties: ["status"] },
  ],
  uniques: [
    { name: "memberships_organization_user_unique", properties: ["organizationId", "userId"] },
  ],
});

export const ORGANIZATION_SCHEMAS = [
  TenantSchema,
  GroupSchema,
  OrganizationSchema,
  BusinessUnitSchema,
  DepartmentSchema,
  TeamSchema,
  MembershipSchema,
] as const;

export class InvalidOrganizationFieldError extends Error {
  constructor(field: string) {
    super(`Organization ${field} is invalid.`);
    this.name = "InvalidOrganizationFieldError";
  }
}
function required(value: string, field: string): string {
  const result = value.trim();
  if (!result) throw new InvalidOrganizationFieldError(field);
  return result;
}
function optional(value: string | null | undefined): string | null {
  const result = value?.trim();
  return result ? result : null;
}
function slug(value: string): string {
  const result = required(value, "slug").toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new InvalidOrganizationFieldError("slug");
  return result;
}
function code(value: string, field: string, length?: number): string {
  const result = required(value, field).toUpperCase();
  if (length !== undefined && result.length !== length)
    throw new InvalidOrganizationFieldError(field);
  return result;
}
