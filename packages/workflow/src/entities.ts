import { EntitySchema } from "@mikro-orm/core";
import type {
  OrganizationId,
  RoleId,
  TenantId,
  UserId,
  WorkflowApprovalId,
  WorkflowAuditLogId,
  WorkflowDefinitionId,
  WorkflowEventId,
  WorkflowInstanceId,
  WorkflowTaskId,
  WorkflowVersionId,
} from "@tnvios/database/contracts";
import { createEntityId, type EntityId } from "@tnvios/database/identifiers";

export const WORKFLOW_DEFINITION_STATUSES = ["draft", "active", "archived"] as const;
export const WORKFLOW_VERSION_STATUSES = ["draft", "published", "retired"] as const;
export const WORKFLOW_INSTANCE_STATUSES = [
  "running",
  "waiting",
  "completed",
  "cancelled",
  "failed",
  "escalated",
] as const;
export const WORKFLOW_TASK_TYPES = ["approval", "task"] as const;
export const WORKFLOW_TASK_STATUSES = [
  "pending",
  "in_progress",
  "approved",
  "rejected",
  "completed",
  "cancelled",
  "escalated",
] as const;
export const APPROVAL_DECISIONS = ["approved", "rejected"] as const;
export const WORKFLOW_NODE_TYPES = [
  "start",
  "end",
  "approval",
  "task",
  "condition",
  "notification",
  "ai",
  "webhook",
  "wait",
  "integration",
  "script-safe-action",
] as const;

export type WorkflowDefinitionStatus = (typeof WORKFLOW_DEFINITION_STATUSES)[number];
export type WorkflowVersionStatus = (typeof WORKFLOW_VERSION_STATUSES)[number];
export type WorkflowInstanceStatus = (typeof WORKFLOW_INSTANCE_STATUSES)[number];
export type WorkflowTaskType = (typeof WORKFLOW_TASK_TYPES)[number];
export type WorkflowTaskStatus = (typeof WORKFLOW_TASK_STATUSES)[number];
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];
export type WorkflowNodeType = (typeof WORKFLOW_NODE_TYPES)[number];

export interface WorkflowNode {
  readonly key: string;
  readonly type: WorkflowNodeType;
  readonly name?: string;
  readonly configuration?: Readonly<Record<string, unknown>>;
}
export interface WorkflowVersionDefinition {
  readonly trigger: Readonly<Record<string, unknown>>;
  readonly nodes: readonly WorkflowNode[];
}

export class WorkflowDefinition {
  id: WorkflowDefinitionId = createEntityId<"workflow_definition">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  name: string;
  description: string | null;
  module: string;
  status: WorkflowDefinitionStatus = "draft";
  createdAt = new Date();
  updatedAt = new Date();
  deletedAt: Date | null = null;
  createdBy: UserId;
  updatedBy: UserId;
  deletedBy: UserId | null = null;

  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    name: string;
    description?: string | null;
    module: string;
    createdBy: UserId;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.name = required(input.name, "name");
    this.description = optional(input.description);
    this.module = key(input.module, "module");
    this.createdBy = input.createdBy;
    this.updatedBy = input.createdBy;
  }

  activate(actorId: UserId, at = new Date()): void {
    if (this.status === "archived")
      throw new InvalidWorkflowStateError("definition", "archived", "active");
    this.status = "active";
    this.updatedBy = actorId;
    this.updatedAt = at;
  }
}

export class WorkflowVersion {
  id: WorkflowVersionId = createEntityId<"workflow_version">();
  workflowId: WorkflowDefinitionId;
  version: number;
  definition: WorkflowVersionDefinition;
  status: WorkflowVersionStatus = "draft";
  publishedAt: Date | null = null;
  createdAt = new Date();
  createdBy: UserId;

  constructor(input: {
    workflowId: WorkflowDefinitionId;
    version: number;
    definition: WorkflowVersionDefinition;
    createdBy: UserId;
  }) {
    this.workflowId = input.workflowId;
    this.version = positiveInteger(input.version, "version");
    this.definition = validateDefinition(input.definition);
    this.createdBy = input.createdBy;
  }

  publish(at = new Date()): void {
    if (this.status !== "draft")
      throw new InvalidWorkflowStateError("version", this.status, "published");
    this.status = "published";
    this.publishedAt = at;
  }
}

export class WorkflowInstance {
  id: WorkflowInstanceId = createEntityId<"workflow_instance">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  workflowId: WorkflowDefinitionId;
  workflowVersionId: WorkflowVersionId;
  entityType: string;
  entityId: EntityId;
  status: WorkflowInstanceStatus = "running";
  context: Record<string, unknown>;
  requesterUserId: UserId;
  startedAt = new Date();
  completedAt: Date | null = null;
  createdBy: UserId;

  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    workflowId: WorkflowDefinitionId;
    workflowVersionId: WorkflowVersionId;
    entityType: string;
    entityId: EntityId;
    context?: Record<string, unknown>;
    requesterUserId: UserId;
    createdBy: UserId;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.workflowId = input.workflowId;
    this.workflowVersionId = input.workflowVersionId;
    this.entityType = key(input.entityType, "entityType");
    this.entityId = input.entityId;
    this.context = input.context ?? {};
    this.requesterUserId = input.requesterUserId;
    this.createdBy = input.createdBy;
  }

  wait(): void {
    this.transition("waiting");
  }
  complete(at = new Date()): void {
    this.transition("completed");
    this.completedAt = at;
  }
  fail(at = new Date()): void {
    this.transition("failed");
    this.completedAt = at;
  }
  cancel(at = new Date()): void {
    this.transition("cancelled");
    this.completedAt = at;
  }
  private transition(to: WorkflowInstanceStatus): void {
    if (["completed", "cancelled", "failed"].includes(this.status)) {
      throw new InvalidWorkflowStateError("instance", this.status, to);
    }
    this.status = to;
  }
}

export class WorkflowTask {
  id: WorkflowTaskId = createEntityId<"workflow_task">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  workflowInstanceId: WorkflowInstanceId;
  nodeKey: string;
  assignedToUserId: UserId | null;
  assignedToRoleId: RoleId | null;
  taskType: WorkflowTaskType;
  status: WorkflowTaskStatus = "pending";
  title: string;
  description: string | null;
  dueAt: Date | null;
  completedAt: Date | null = null;
  createdAt = new Date();

  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    workflowInstanceId: WorkflowInstanceId;
    nodeKey: string;
    assignedToUserId?: UserId | null;
    assignedToRoleId?: RoleId | null;
    taskType: WorkflowTaskType;
    title: string;
    description?: string | null;
    dueAt?: Date | null;
  }) {
    if (!input.assignedToUserId && !input.assignedToRoleId)
      throw new InvalidWorkflowFieldError("assignee");
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.workflowInstanceId = input.workflowInstanceId;
    this.nodeKey = key(input.nodeKey, "nodeKey");
    this.assignedToUserId = input.assignedToUserId ?? null;
    this.assignedToRoleId = input.assignedToRoleId ?? null;
    this.taskType = input.taskType;
    this.title = required(input.title, "title");
    this.description = optional(input.description);
    this.dueAt = input.dueAt ?? null;
  }

  decide(decision: ApprovalDecision, at = new Date()): void {
    if (this.taskType !== "approval" || !["pending", "in_progress"].includes(this.status)) {
      throw new InvalidWorkflowStateError("task", this.status, decision);
    }
    this.status = decision;
    this.completedAt = at;
  }
  complete(at = new Date()): void {
    if (this.taskType !== "task" || !["pending", "in_progress"].includes(this.status)) {
      throw new InvalidWorkflowStateError("task", this.status, "completed");
    }
    this.status = "completed";
    this.completedAt = at;
  }
}

export class WorkflowApproval {
  id: WorkflowApprovalId = createEntityId<"workflow_approval">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  workflowInstanceId: WorkflowInstanceId;
  workflowTaskId: WorkflowTaskId;
  decision: ApprovalDecision;
  decidedBy: UserId;
  comment: string | null;
  decidedAt = new Date();

  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    workflowInstanceId: WorkflowInstanceId;
    workflowTaskId: WorkflowTaskId;
    decision: ApprovalDecision;
    decidedBy: UserId;
    comment?: string | null;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.workflowInstanceId = input.workflowInstanceId;
    this.workflowTaskId = input.workflowTaskId;
    this.decision = input.decision;
    this.decidedBy = input.decidedBy;
    this.comment = optional(input.comment);
  }
}

export class WorkflowEvent {
  id: WorkflowEventId = createEntityId<"workflow_event">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  workflowInstanceId: WorkflowInstanceId;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt = new Date();
  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    workflowInstanceId: WorkflowInstanceId;
    eventType: string;
    payload?: Record<string, unknown>;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.workflowInstanceId = input.workflowInstanceId;
    this.eventType = eventName(input.eventType);
    this.payload = input.payload ?? {};
  }
}

export class WorkflowAuditLog {
  id: WorkflowAuditLogId = createEntityId<"workflow_audit_log">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  workflowInstanceId: WorkflowInstanceId;
  workflowTaskId: WorkflowTaskId | null;
  actorUserId: UserId;
  action: string;
  oldStatus: string | null;
  newStatus: string | null;
  metadata: Record<string, unknown>;
  createdAt = new Date();
  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    workflowInstanceId: WorkflowInstanceId;
    workflowTaskId?: WorkflowTaskId | null;
    actorUserId: UserId;
    action: string;
    oldStatus?: string | null;
    newStatus?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.workflowInstanceId = input.workflowInstanceId;
    this.workflowTaskId = input.workflowTaskId ?? null;
    this.actorUserId = input.actorUserId;
    this.action = required(input.action, "action");
    this.oldStatus = optional(input.oldStatus);
    this.newStatus = optional(input.newStatus);
    this.metadata = input.metadata ?? {};
  }
}

const commonContext = {
  tenantId: { fieldName: "tenant_id", type: "uuid" },
  organizationId: { fieldName: "organization_id", type: "uuid" },
} as const;
export const WorkflowDefinitionSchema = new EntitySchema<WorkflowDefinition>({
  class: WorkflowDefinition,
  tableName: "workflows",
  properties: {
    id: { primary: true, type: "uuid" },
    ...commonContext,
    name: { type: "text" },
    description: { nullable: true, type: "text" },
    module: { type: "text" },
    status: {
      enum: true,
      items: () => WORKFLOW_DEFINITION_STATUSES,
      nativeEnumName: "workflow_definition_status",
    },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
    updatedAt: { fieldName: "updated_at", type: "timestamptz" },
    deletedAt: { fieldName: "deleted_at", nullable: true, type: "timestamptz" },
    createdBy: { fieldName: "created_by", type: "uuid" },
    updatedBy: { fieldName: "updated_by", type: "uuid" },
    deletedBy: { fieldName: "deleted_by", nullable: true, type: "uuid" },
  },
});
export const WorkflowVersionSchema = new EntitySchema<WorkflowVersion>({
  class: WorkflowVersion,
  tableName: "workflow_versions",
  properties: {
    id: { primary: true, type: "uuid" },
    workflowId: { fieldName: "workflow_id", type: "uuid" },
    version: { type: "integer" },
    definition: { type: "jsonb" },
    status: {
      enum: true,
      items: () => WORKFLOW_VERSION_STATUSES,
      nativeEnumName: "workflow_version_status",
    },
    publishedAt: { fieldName: "published_at", nullable: true, type: "timestamptz" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
    createdBy: { fieldName: "created_by", type: "uuid" },
  },
});
export const WorkflowInstanceSchema = new EntitySchema<WorkflowInstance>({
  class: WorkflowInstance,
  tableName: "workflow_instances",
  properties: {
    id: { primary: true, type: "uuid" },
    ...commonContext,
    workflowId: { fieldName: "workflow_id", type: "uuid" },
    workflowVersionId: { fieldName: "workflow_version_id", type: "uuid" },
    entityType: { fieldName: "entity_type", type: "text" },
    entityId: { fieldName: "entity_id", type: "uuid" },
    status: {
      enum: true,
      items: () => WORKFLOW_INSTANCE_STATUSES,
      nativeEnumName: "workflow_instance_status",
    },
    context: { type: "jsonb" },
    requesterUserId: { fieldName: "requester_user_id", type: "uuid" },
    startedAt: { fieldName: "started_at", type: "timestamptz" },
    completedAt: { fieldName: "completed_at", nullable: true, type: "timestamptz" },
    createdBy: { fieldName: "created_by", type: "uuid" },
  },
});
export const WorkflowTaskSchema = new EntitySchema<WorkflowTask>({
  class: WorkflowTask,
  tableName: "workflow_tasks",
  properties: {
    id: { primary: true, type: "uuid" },
    ...commonContext,
    workflowInstanceId: { fieldName: "workflow_instance_id", type: "uuid" },
    nodeKey: { fieldName: "node_key", type: "text" },
    assignedToUserId: { fieldName: "assigned_to_user_id", nullable: true, type: "uuid" },
    assignedToRoleId: { fieldName: "assigned_to_role_id", nullable: true, type: "uuid" },
    taskType: {
      fieldName: "task_type",
      enum: true,
      items: () => WORKFLOW_TASK_TYPES,
      nativeEnumName: "workflow_task_type",
    },
    status: {
      enum: true,
      items: () => WORKFLOW_TASK_STATUSES,
      nativeEnumName: "workflow_task_status",
    },
    title: { type: "text" },
    description: { nullable: true, type: "text" },
    dueAt: { fieldName: "due_at", nullable: true, type: "timestamptz" },
    completedAt: { fieldName: "completed_at", nullable: true, type: "timestamptz" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
  },
});
export const WorkflowApprovalSchema = new EntitySchema<WorkflowApproval>({
  class: WorkflowApproval,
  tableName: "workflow_approvals",
  properties: {
    id: { primary: true, type: "uuid" },
    ...commonContext,
    workflowInstanceId: { fieldName: "workflow_instance_id", type: "uuid" },
    workflowTaskId: { fieldName: "workflow_task_id", type: "uuid" },
    decision: {
      enum: true,
      items: () => APPROVAL_DECISIONS,
      nativeEnumName: "workflow_approval_decision",
    },
    decidedBy: { fieldName: "decided_by", type: "uuid" },
    comment: { nullable: true, type: "text" },
    decidedAt: { fieldName: "decided_at", type: "timestamptz" },
  },
});
export const WorkflowEventSchema = new EntitySchema<WorkflowEvent>({
  class: WorkflowEvent,
  tableName: "workflow_events",
  properties: {
    id: { primary: true, type: "uuid" },
    ...commonContext,
    workflowInstanceId: { fieldName: "workflow_instance_id", type: "uuid" },
    eventType: { fieldName: "event_type", type: "text" },
    payload: { type: "jsonb" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
  },
});
export const WorkflowAuditLogSchema = new EntitySchema<WorkflowAuditLog>({
  class: WorkflowAuditLog,
  tableName: "workflow_audit_logs",
  properties: {
    id: { primary: true, type: "uuid" },
    ...commonContext,
    workflowInstanceId: { fieldName: "workflow_instance_id", type: "uuid" },
    workflowTaskId: { fieldName: "workflow_task_id", nullable: true, type: "uuid" },
    actorUserId: { fieldName: "actor_user_id", type: "uuid" },
    action: { type: "text" },
    oldStatus: { fieldName: "old_status", nullable: true, type: "text" },
    newStatus: { fieldName: "new_status", nullable: true, type: "text" },
    metadata: { type: "jsonb" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
  },
});
export const WORKFLOW_SCHEMAS = [
  WorkflowDefinitionSchema,
  WorkflowVersionSchema,
  WorkflowInstanceSchema,
  WorkflowTaskSchema,
  WorkflowApprovalSchema,
  WorkflowEventSchema,
  WorkflowAuditLogSchema,
] as const;

export class InvalidWorkflowFieldError extends Error {
  constructor(field: string) {
    super(`Workflow ${field} is invalid.`);
    this.name = "InvalidWorkflowFieldError";
  }
}
export class InvalidWorkflowStateError extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`Workflow ${entity} cannot transition from "${from}" to "${to}".`);
    this.name = "InvalidWorkflowStateError";
  }
}
function required(value: string, field: string): string {
  const result = value.trim();
  if (!result) throw new InvalidWorkflowFieldError(field);
  return result;
}
function optional(value: string | null | undefined): string | null {
  const result = value?.trim();
  return result ? result : null;
}
function key(value: string, field: string): string {
  const result = required(value, field).toLowerCase();
  if (!/^[a-z][a-z0-9_.-]*$/.test(result)) throw new InvalidWorkflowFieldError(field);
  return result;
}
function eventName(value: string): string {
  const result = key(value, "eventType");
  if (!result.startsWith("workflow.")) throw new InvalidWorkflowFieldError("eventType");
  return result;
}
function positiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1) throw new InvalidWorkflowFieldError(field);
  return value;
}
function validateDefinition(definition: WorkflowVersionDefinition): WorkflowVersionDefinition {
  if (!definition.nodes.length) throw new InvalidWorkflowFieldError("definition.nodes");
  const keys = new Set<string>();
  for (const node of definition.nodes) {
    const nodeKey = key(node.key, "node.key");
    if (keys.has(nodeKey)) throw new InvalidWorkflowFieldError("definition.nodes");
    keys.add(nodeKey);
  }
  return definition;
}
