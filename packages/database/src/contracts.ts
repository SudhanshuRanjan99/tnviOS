import type { EntityId } from "./identifiers.js";

export type TenantId = EntityId<"tenant">;
export type GroupId = EntityId<"group">;
export type OrganizationId = EntityId<"organization">;
export type UserId = EntityId<"user">;
export type BusinessUnitId = EntityId<"business_unit">;
export type DepartmentId = EntityId<"department">;
export type TeamId = EntityId<"team">;
export type MembershipId = EntityId<"membership">;
export type PermissionId = EntityId<"permission">;
export type RoleId = EntityId<"role">;
export type UserRoleId = EntityId<"user_role">;
export type AuthorizationLogId = EntityId<"authorization_log">;
export type FieldPermissionId = EntityId<"field_permission">;
export type ResourcePermissionId = EntityId<"resource_permission">;
export type AuditLogId = EntityId<"audit_log">;
export type EventId = EntityId<"event">;
export type EventDefinitionId = EntityId<"event_definition">;
export type ConsumerReceiptId = EntityId<"consumer_receipt">;
export type NotificationId = EntityId<"notification">;
export type NotificationTemplateId = EntityId<"notification_template">;
export type NotificationDeliveryId = EntityId<"notification_delivery">;
export type FileId = EntityId<"file">;
export type FilePermissionId = EntityId<"file_permission">;
export type WorkflowDefinitionId = EntityId<"workflow_definition">;
export type WorkflowVersionId = EntityId<"workflow_version">;
export type WorkflowInstanceId = EntityId<"workflow_instance">;
export type WorkflowTaskId = EntityId<"workflow_task">;
export type WorkflowApprovalId = EntityId<"workflow_approval">;
export type WorkflowEventId = EntityId<"workflow_event">;
export type WorkflowAuditLogId = EntityId<"workflow_audit_log">;

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
