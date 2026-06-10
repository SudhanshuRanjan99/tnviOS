import { EntitySchema } from "@mikro-orm/core";
import type {
  AuthorizationLogId,
  FieldPermissionId,
  OrganizationId,
  PermissionId,
  ResourcePermissionId,
  RoleId,
  TenantId,
  UserId,
  UserRoleId,
} from "@tnvios/database/contracts";
import { createEntityId, type EntityId } from "@tnvios/database/identifiers";

export const SCOPE_LEVELS = [
  "tenant",
  "organization",
  "business_unit",
  "department",
  "team",
  "personal",
  "record",
  "field",
] as const;
export const POLICY_EFFECTS = ["allow", "deny"] as const;
export const AUTHORIZATION_DECISIONS = ["allow", "deny"] as const;
export type ScopeLevel = (typeof SCOPE_LEVELS)[number];
export type PolicyEffect = (typeof POLICY_EFFECTS)[number];
export type AuthorizationDecision = (typeof AUTHORIZATION_DECISIONS)[number];

export class Permission {
  id: PermissionId = createEntityId<"permission">();
  code: string;
  name: string;
  description: string | null = null;
  module: string;
  resource: string;
  action: string;
  createdAt = new Date();
  updatedAt = new Date();
  constructor(input: { code: string; name: string; description?: string | null }) {
    this.code = permissionCode(input.code);
    [this.module, this.resource, this.action] = this.code.split(".") as [string, string, string];
    this.name = required(input.name, "name");
    this.description = optional(input.description);
  }
}

export class Role {
  id: RoleId = createEntityId<"role">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  name: string;
  description: string | null = null;
  scopeLevel: ScopeLevel;
  status: "active" | "inactive" = "active";
  createdAt = new Date();
  updatedAt = new Date();
  deletedAt: Date | null = null;
  createdBy: UserId | null = null;
  updatedBy: UserId | null = null;
  deletedBy: UserId | null = null;
  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    name: string;
    description?: string | null;
    scopeLevel: ScopeLevel;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.name = required(input.name, "name");
    this.description = optional(input.description);
    this.scopeLevel = input.scopeLevel;
  }
}

export class RolePermission {
  roleId: RoleId;
  permissionId: PermissionId;
  createdAt = new Date();
  createdBy: UserId | null = null;
  constructor(input: { roleId: RoleId; permissionId: PermissionId; createdBy?: UserId | null }) {
    this.roleId = input.roleId;
    this.permissionId = input.permissionId;
    this.createdBy = input.createdBy ?? null;
  }
}

export class UserRole {
  id: UserRoleId = createEntityId<"user_role">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  userId: UserId;
  roleId: RoleId;
  scopeLevel: ScopeLevel;
  scopeId: EntityId | null = null;
  createdAt = new Date();
  createdBy: UserId | null = null;
  deletedAt: Date | null = null;
  deletedBy: UserId | null = null;
  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    userId: UserId;
    roleId: RoleId;
    scopeLevel: ScopeLevel;
    scopeId?: EntityId | null;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.userId = input.userId;
    this.roleId = input.roleId;
    this.scopeLevel = input.scopeLevel;
    this.scopeId = input.scopeId ?? null;
  }
}

export class FieldPermission {
  id: FieldPermissionId = createEntityId<"field_permission">();
  roleId: RoleId;
  permissionCode: string;
  resourceType: string;
  fieldName: string;
  effect: PolicyEffect;
  createdAt = new Date();
  constructor(input: {
    roleId: RoleId;
    permissionCode: string;
    resourceType: string;
    fieldName: string;
    effect?: PolicyEffect;
  }) {
    this.roleId = input.roleId;
    this.permissionCode = permissionCode(input.permissionCode);
    this.resourceType = required(input.resourceType, "resourceType");
    this.fieldName = required(input.fieldName, "fieldName");
    this.effect = input.effect ?? "allow";
  }
}

export class ResourcePermission {
  id: ResourcePermissionId = createEntityId<"resource_permission">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  userId: UserId;
  permissionCode: string;
  resourceType: string;
  resourceId: EntityId;
  effect: PolicyEffect;
  createdAt = new Date();
  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    userId: UserId;
    permissionCode: string;
    resourceType: string;
    resourceId: EntityId;
    effect?: PolicyEffect;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.userId = input.userId;
    this.permissionCode = permissionCode(input.permissionCode);
    this.resourceType = required(input.resourceType, "resourceType");
    this.resourceId = input.resourceId;
    this.effect = input.effect ?? "allow";
  }
}

export class AuthorizationLog {
  id: AuthorizationLogId = createEntityId<"authorization_log">();
  tenantId: TenantId | null;
  organizationId: OrganizationId | null;
  userId: UserId | null;
  permissionCode: string | null;
  resourceType: string | null;
  resourceId: EntityId | null;
  decision: AuthorizationDecision;
  reason: string;
  context: Record<string, unknown>;
  createdAt = new Date();
  constructor(input: {
    tenantId?: TenantId | null;
    organizationId?: OrganizationId | null;
    userId?: UserId | null;
    permissionCode?: string | null;
    resourceType?: string | null;
    resourceId?: EntityId | null;
    decision: AuthorizationDecision;
    reason: string;
    context?: Record<string, unknown>;
  }) {
    this.tenantId = input.tenantId ?? null;
    this.organizationId = input.organizationId ?? null;
    this.userId = input.userId ?? null;
    this.permissionCode = input.permissionCode ?? null;
    this.resourceType = input.resourceType ?? null;
    this.resourceId = input.resourceId ?? null;
    this.decision = input.decision;
    this.reason = required(input.reason, "reason");
    this.context = input.context ?? {};
  }
}

const scopedAudit = {
  createdAt: { fieldName: "created_at", type: "timestamptz" },
  updatedAt: { fieldName: "updated_at", onUpdate: () => new Date(), type: "timestamptz" },
  deletedAt: { fieldName: "deleted_at", nullable: true, type: "timestamptz" },
  createdBy: { fieldName: "created_by", nullable: true, type: "uuid" },
  updatedBy: { fieldName: "updated_by", nullable: true, type: "uuid" },
  deletedBy: { fieldName: "deleted_by", nullable: true, type: "uuid" },
} as const;
const scope = {
  enum: true,
  items: () => SCOPE_LEVELS,
  nativeEnumName: "permission_scope_level",
} as const;
const effect = {
  enum: true,
  items: () => POLICY_EFFECTS,
  nativeEnumName: "policy_effect",
} as const;

export const PermissionSchema = new EntitySchema<Permission>({
  class: Permission,
  tableName: "permissions",
  properties: {
    id: { primary: true, type: "uuid" },
    code: { type: "text", unique: "permissions_code_unique" },
    name: { type: "text" },
    description: { nullable: true, type: "text" },
    module: { type: "text" },
    resource: { type: "text" },
    action: { type: "text" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
    updatedAt: { fieldName: "updated_at", onUpdate: () => new Date(), type: "timestamptz" },
  },
});
export const RoleSchema = new EntitySchema<Role>({
  class: Role,
  tableName: "roles",
  uniques: [{ name: "roles_organization_name_unique", properties: ["organizationId", "name"] }],
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    organizationId: { fieldName: "organization_id", type: "uuid" },
    name: { type: "text" },
    description: { nullable: true, type: "text" },
    scopeLevel: { ...scope, fieldName: "scope_level" },
    status: { type: "text" },
    ...scopedAudit,
  },
});
export const RolePermissionSchema = new EntitySchema<RolePermission>({
  class: RolePermission,
  tableName: "role_permissions",
  properties: {
    roleId: { fieldName: "role_id", primary: true, type: "uuid" },
    permissionId: { fieldName: "permission_id", primary: true, type: "uuid" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
    createdBy: { fieldName: "created_by", nullable: true, type: "uuid" },
  },
});
export const UserRoleSchema = new EntitySchema<UserRole>({
  class: UserRole,
  tableName: "user_roles",
  indexes: [
    { name: "user_roles_user_context_index", properties: ["userId", "tenantId", "organizationId"] },
  ],
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    organizationId: { fieldName: "organization_id", type: "uuid" },
    userId: { fieldName: "user_id", type: "uuid" },
    roleId: { fieldName: "role_id", type: "uuid" },
    scopeLevel: { ...scope, fieldName: "scope_level" },
    scopeId: { fieldName: "scope_id", nullable: true, type: "uuid" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
    createdBy: { fieldName: "created_by", nullable: true, type: "uuid" },
    deletedAt: { fieldName: "deleted_at", nullable: true, type: "timestamptz" },
    deletedBy: { fieldName: "deleted_by", nullable: true, type: "uuid" },
  },
});
export const FieldPermissionSchema = new EntitySchema<FieldPermission>({
  class: FieldPermission,
  tableName: "field_permissions",
  properties: {
    id: { primary: true, type: "uuid" },
    roleId: { fieldName: "role_id", type: "uuid" },
    permissionCode: { fieldName: "permission_code", type: "text" },
    resourceType: { fieldName: "resource_type", type: "text" },
    fieldName: { fieldName: "field_name", type: "text" },
    effect,
    createdAt: { fieldName: "created_at", type: "timestamptz" },
  },
});
export const ResourcePermissionSchema = new EntitySchema<ResourcePermission>({
  class: ResourcePermission,
  tableName: "resource_permissions",
  indexes: [
    {
      name: "resource_permissions_lookup_index",
      properties: ["userId", "resourceType", "resourceId"],
    },
  ],
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    organizationId: { fieldName: "organization_id", type: "uuid" },
    userId: { fieldName: "user_id", type: "uuid" },
    permissionCode: { fieldName: "permission_code", type: "text" },
    resourceType: { fieldName: "resource_type", type: "text" },
    resourceId: { fieldName: "resource_id", type: "uuid" },
    effect,
    createdAt: { fieldName: "created_at", type: "timestamptz" },
  },
});
export const AuthorizationLogSchema = new EntitySchema<AuthorizationLog>({
  class: AuthorizationLog,
  tableName: "authorization_logs",
  indexes: [
    {
      name: "authorization_logs_context_index",
      properties: ["tenantId", "organizationId", "createdAt"],
    },
  ],
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", nullable: true, type: "uuid" },
    organizationId: { fieldName: "organization_id", nullable: true, type: "uuid" },
    userId: { fieldName: "user_id", nullable: true, type: "uuid" },
    permissionCode: { fieldName: "permission_code", nullable: true, type: "text" },
    resourceType: { fieldName: "resource_type", nullable: true, type: "text" },
    resourceId: { fieldName: "resource_id", nullable: true, type: "uuid" },
    decision: {
      enum: true,
      items: () => AUTHORIZATION_DECISIONS,
      nativeEnumName: "authorization_decision",
    },
    reason: { type: "text" },
    context: { type: "jsonb" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
  },
});
export const POLICY_SCHEMAS = [
  PermissionSchema,
  RoleSchema,
  RolePermissionSchema,
  UserRoleSchema,
  FieldPermissionSchema,
  ResourcePermissionSchema,
  AuthorizationLogSchema,
] as const;

export class InvalidPolicyFieldError extends Error {
  constructor(field: string) {
    super(`Policy ${field} is invalid.`);
    this.name = "InvalidPolicyFieldError";
  }
}
function required(value: string, field: string) {
  const result = value.trim();
  if (!result) throw new InvalidPolicyFieldError(field);
  return result;
}
function optional(value: string | null | undefined) {
  const result = value?.trim();
  return result ? result : null;
}
function permissionCode(value: string) {
  const result = required(value, "permissionCode").toLowerCase();
  if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(result))
    throw new InvalidPolicyFieldError("permissionCode");
  return result;
}
