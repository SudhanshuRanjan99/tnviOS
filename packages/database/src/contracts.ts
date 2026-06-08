import type { EntityId } from "./identifiers.js";

export type TenantId = EntityId<"tenant">;
export type OrganizationId = EntityId<"organization">;
export type UserId = EntityId<"user">;
export type BusinessUnitId = EntityId<"business_unit">;
export type DepartmentId = EntityId<"department">;
export type TeamId = EntityId<"team">;

export interface IdentifiedEntity {
  id: EntityId;
}

export interface TimestampedEntity {
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditedEntity {
  createdBy: UserId | null;
  updatedBy: UserId | null;
}

export interface SoftDeletableEntity {
  deletedAt: Date | null;
  deletedBy: UserId | null;
}

export interface TenantScopedEntity {
  tenantId: TenantId;
}

export interface OrganizationScopedEntity extends TenantScopedEntity {
  organizationId: OrganizationId;
}

export interface HierarchyScope {
  businessUnitId: BusinessUnitId | null;
  departmentId: DepartmentId | null;
  teamId: TeamId | null;
}

export interface TenantContext {
  tenantId: TenantId;
}

export interface OrganizationContext extends TenantContext {
  organizationId: OrganizationId;
}

export interface ActorContext {
  userId: UserId;
}

export interface MutationContext extends OrganizationContext, ActorContext {
  correlationId: EntityId<"correlation">;
}

export interface BusinessEntityFields
  extends
    IdentifiedEntity,
    OrganizationScopedEntity,
    TimestampedEntity,
    AuditedEntity,
    SoftDeletableEntity {}
