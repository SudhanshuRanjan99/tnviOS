import { EntitySchema } from "@mikro-orm/core";
import type { AuditLogId, OrganizationId, TenantId, UserId } from "@tnvios/database/contracts";
import { createEntityId, type EntityId } from "@tnvios/database/identifiers";

export class AuditLog {
  id: AuditLogId = createEntityId<"audit_log">();
  tenantId: TenantId;
  organizationId: OrganizationId | null;
  userId: UserId | null;
  entityType: string;
  entityId: EntityId | null;
  action: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  correlationId: EntityId<"correlation"> | null;
  createdAt = new Date();

  constructor(input: {
    tenantId: TenantId;
    organizationId?: OrganizationId | null;
    userId?: UserId | null;
    entityType: string;
    entityId?: EntityId | null;
    action: string;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
    correlationId?: EntityId<"correlation"> | null;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId ?? null;
    this.userId = input.userId ?? null;
    this.entityType = required(input.entityType, "entityType");
    this.entityId = input.entityId ?? null;
    this.action = required(input.action, "action");
    this.oldValues = input.oldValues ?? null;
    this.newValues = input.newValues ?? null;
    this.metadata = input.metadata ?? {};
    this.correlationId = input.correlationId ?? null;
  }
}

export interface AuditWriter {
  write(log: AuditLog): Promise<void>;
}

export const AuditLogSchema = new EntitySchema<AuditLog>({
  class: AuditLog,
  tableName: "audit_logs",
  indexes: [
    { name: "audit_logs_context_index", properties: ["tenantId", "organizationId", "createdAt"] },
  ],
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    organizationId: { fieldName: "organization_id", nullable: true, type: "uuid" },
    userId: { fieldName: "user_id", nullable: true, type: "uuid" },
    entityType: { fieldName: "entity_type", type: "text" },
    entityId: { fieldName: "entity_id", nullable: true, type: "uuid" },
    action: { type: "text" },
    oldValues: { fieldName: "old_values", nullable: true, type: "jsonb" },
    newValues: { fieldName: "new_values", nullable: true, type: "jsonb" },
    metadata: { type: "jsonb" },
    correlationId: { fieldName: "correlation_id", nullable: true, type: "uuid" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
  },
});

export class InvalidAuditFieldError extends Error {
  constructor(field: string) {
    super(`Audit ${field} is required.`);
    this.name = "InvalidAuditFieldError";
  }
}
function required(value: string, field: string) {
  const result = value.trim();
  if (!result) throw new InvalidAuditFieldError(field);
  return result;
}
