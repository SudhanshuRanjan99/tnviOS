import type { OrganizationId, TenantId, UserId } from "@tnvios/database/contracts";
import type { EntityId } from "@tnvios/database/identifiers";

export interface ServiceContext {
  readonly tenantId: TenantId;
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
}
export interface EntityReference {
  readonly entityType: string;
  readonly entityId: EntityId;
}
export interface ServiceEvent {
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: EntityId;
  readonly payload: Readonly<Record<string, unknown>>;
}
export interface MutationRepository<Entity> {
  save(entity: Entity, event: ServiceEvent): Promise<void>;
}

export function required(value: string, field: string): string {
  const result = value.trim();
  if (!result) throw new InvalidSharedServiceFieldError(field);
  return result;
}
export function key(value: string, field: string): string {
  const result = required(value, field).toLowerCase();
  if (!/^[a-z][a-z0-9_.-]*$/.test(result)) throw new InvalidSharedServiceFieldError(field);
  return result;
}
export class InvalidSharedServiceFieldError extends Error {
  constructor(field: string) {
    super(`Shared service ${field} is invalid.`);
    this.name = "InvalidSharedServiceFieldError";
  }
}
