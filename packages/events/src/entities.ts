import { EntitySchema } from "@mikro-orm/core";
import type {
  ConsumerReceiptId,
  EventDefinitionId,
  EventId,
  OrganizationId,
  TenantId,
  UserId,
} from "@tnvios/database/contracts";
import { createEntityId, type EntityId } from "@tnvios/database/identifiers";

export const OUTBOX_STATUSES = ["pending", "publishing", "published", "failed"] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export class OutboxEvent {
  id: EventId = createEntityId<"event">();
  tenantId: TenantId | null;
  organizationId: OrganizationId | null;
  eventType: string;
  eventVersion: number;
  source: string;
  userId: UserId | null;
  aggregateType: string | null;
  aggregateId: EntityId | null;
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
  correlationId: EntityId<"correlation"> | null;
  causationId: EventId | null;
  status: OutboxStatus = "pending";
  attempts = 0;
  availableAt = new Date();
  publishedAt: Date | null = null;
  createdAt = new Date();
  constructor(input: {
    eventType: string;
    eventVersion?: number;
    source: string;
    tenantId?: TenantId | null;
    organizationId?: OrganizationId | null;
    userId?: UserId | null;
    aggregateType?: string | null;
    aggregateId?: EntityId | null;
    payload: Record<string, unknown>;
    headers?: Record<string, unknown>;
    correlationId?: EntityId<"correlation"> | null;
    causationId?: EventId | null;
    availableAt?: Date;
  }) {
    this.eventType = eventName(input.eventType);
    this.eventVersion = input.eventVersion ?? 1;
    this.source = required(input.source, "source");
    this.tenantId = input.tenantId ?? null;
    this.organizationId = input.organizationId ?? null;
    this.userId = input.userId ?? null;
    this.aggregateType = optional(input.aggregateType);
    this.aggregateId = input.aggregateId ?? null;
    this.payload = input.payload;
    this.headers = input.headers ?? {};
    this.correlationId = input.correlationId ?? null;
    this.causationId = input.causationId ?? null;
    this.availableAt = input.availableAt ?? new Date();
  }
  markPublished(at = new Date()) {
    this.status = "published";
    this.publishedAt = at;
  }
  markFailed(retryAt: Date) {
    this.status = "failed";
    this.attempts += 1;
    this.availableAt = retryAt;
  }
}

export class EventDefinition {
  id: EventDefinitionId = createEntityId<"event_definition">();
  eventType: string;
  version: number;
  publisher: string;
  consumers: string[];
  schema: Record<string, unknown>;
  description: string | null;
  createdAt = new Date();
  constructor(input: {
    eventType: string;
    version?: number;
    publisher: string;
    consumers?: string[];
    schema?: Record<string, unknown>;
    description?: string | null;
  }) {
    this.eventType = eventName(input.eventType);
    this.version = input.version ?? 1;
    this.publisher = required(input.publisher, "publisher");
    this.consumers = input.consumers ?? [];
    this.schema = input.schema ?? {};
    this.description = optional(input.description);
  }
}

export class ConsumerReceipt {
  id: ConsumerReceiptId = createEntityId<"consumer_receipt">();
  eventId: EventId;
  consumerName: string;
  processedAt = new Date();
  constructor(input: { eventId: EventId; consumerName: string }) {
    this.eventId = input.eventId;
    this.consumerName = required(input.consumerName, "consumerName");
  }
}

const outboxProps = {
  id: { primary: true, type: "uuid" },
  tenantId: { fieldName: "tenant_id", nullable: true, type: "uuid" },
  organizationId: { fieldName: "organization_id", nullable: true, type: "uuid" },
  eventType: { fieldName: "event_type", type: "text" },
  eventVersion: { fieldName: "event_version", type: "integer" },
  source: { type: "text" },
  userId: { fieldName: "user_id", nullable: true, type: "uuid" },
  aggregateType: { fieldName: "aggregate_type", nullable: true, type: "text" },
  aggregateId: { fieldName: "aggregate_id", nullable: true, type: "uuid" },
  payload: { type: "jsonb" },
  headers: { type: "jsonb" },
  correlationId: { fieldName: "correlation_id", nullable: true, type: "uuid" },
  causationId: { fieldName: "causation_id", nullable: true, type: "uuid" },
  status: { enum: true, items: () => OUTBOX_STATUSES, nativeEnumName: "outbox_status" },
  attempts: { type: "integer" },
  availableAt: { fieldName: "available_at", type: "timestamptz" },
  publishedAt: { fieldName: "published_at", nullable: true, type: "timestamptz" },
  createdAt: { fieldName: "created_at", type: "timestamptz" },
} as const;
export const OutboxEventSchema = new EntitySchema<OutboxEvent>({
  class: OutboxEvent,
  tableName: "outbox_events",
  indexes: [
    { name: "outbox_events_pending_index", properties: ["status", "availableAt"] },
    { name: "outbox_events_type_index", properties: ["eventType"] },
  ],
  properties: outboxProps,
});
export const EventDefinitionSchema = new EntitySchema<EventDefinition>({
  class: EventDefinition,
  tableName: "event_registry",
  uniques: [{ name: "event_registry_type_version_unique", properties: ["eventType", "version"] }],
  properties: {
    id: { primary: true, type: "uuid" },
    eventType: { fieldName: "event_type", type: "text" },
    version: { type: "integer" },
    publisher: { type: "text" },
    consumers: { type: "jsonb" },
    schema: { type: "jsonb" },
    description: { nullable: true, type: "text" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
  },
});
export const ConsumerReceiptSchema = new EntitySchema<ConsumerReceipt>({
  class: ConsumerReceipt,
  tableName: "consumer_receipts",
  uniques: [
    { name: "consumer_receipts_event_consumer_unique", properties: ["eventId", "consumerName"] },
  ],
  properties: {
    id: { primary: true, type: "uuid" },
    eventId: { fieldName: "event_id", type: "uuid" },
    consumerName: { fieldName: "consumer_name", type: "text" },
    processedAt: { fieldName: "processed_at", type: "timestamptz" },
  },
});
export const EVENT_SCHEMAS = [
  OutboxEventSchema,
  EventDefinitionSchema,
  ConsumerReceiptSchema,
] as const;

export interface EventEnvelope {
  eventId: EventId;
  eventType: string;
  eventVersion: number;
  timestamp: string;
  tenantId: TenantId | null;
  organizationId: OrganizationId | null;
  userId: UserId | null;
  correlationId: EntityId<"correlation"> | null;
  causationId: EventId | null;
  source: string;
  aggregateType: string | null;
  aggregateId: EntityId | null;
  data: Record<string, unknown>;
}
export function toEventEnvelope(event: OutboxEvent): EventEnvelope {
  return {
    eventId: event.id,
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    timestamp: event.createdAt.toISOString(),
    tenantId: event.tenantId,
    organizationId: event.organizationId,
    userId: event.userId,
    correlationId: event.correlationId,
    causationId: event.causationId,
    source: event.source,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    data: event.payload,
  };
}
export class InvalidEventFieldError extends Error {
  constructor(field: string) {
    super(`Event ${field} is invalid.`);
    this.name = "InvalidEventFieldError";
  }
}
function required(value: string, field: string) {
  const result = value.trim();
  if (!result) throw new InvalidEventFieldError(field);
  return result;
}
function optional(value: string | null | undefined) {
  const result = value?.trim();
  return result ? result : null;
}
function eventName(value: string) {
  const result = required(value, "eventType").toLowerCase();
  if (!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(result))
    throw new InvalidEventFieldError("eventType");
  return result;
}
