import type { RoleId, UserId } from "@tnvios/database/contracts";

import {
  WorkflowApproval,
  WorkflowAuditLog,
  WorkflowEvent,
  WorkflowInstance,
  WorkflowTask,
  type ApprovalDecision,
  type WorkflowVersion,
} from "./entities.js";

export interface WorkflowMutation {
  readonly instance: WorkflowInstance;
  readonly task?: WorkflowTask;
  readonly approval?: WorkflowApproval;
  readonly event: WorkflowEvent;
  readonly audit: WorkflowAuditLog;
}
export interface WorkflowRepository {
  saveMutation(mutation: WorkflowMutation): Promise<void>;
}
export interface StartWorkflowInput {
  readonly version: WorkflowVersion;
  readonly tenantId: WorkflowInstance["tenantId"];
  readonly organizationId: WorkflowInstance["organizationId"];
  readonly entityType: string;
  readonly entityId: WorkflowInstance["entityId"];
  readonly context?: Record<string, unknown>;
  readonly requesterUserId: UserId;
  readonly actorUserId: UserId;
}
export interface CreateTaskInput {
  readonly instance: WorkflowInstance;
  readonly nodeKey: string;
  readonly taskType: WorkflowTask["taskType"];
  readonly title: string;
  readonly description?: string | null;
  readonly assignedToUserId?: UserId | null;
  readonly assignedToRoleId?: RoleId | null;
  readonly dueAt?: Date | null;
  readonly actorUserId: UserId;
}

export class WorkflowEngine {
  constructor(private readonly repository: WorkflowRepository) {}

  async start(input: StartWorkflowInput): Promise<WorkflowInstance> {
    if (input.version.status !== "published") throw new UnpublishedWorkflowVersionError();
    const instance = new WorkflowInstance({
      ...input,
      workflowId: input.version.workflowId,
      workflowVersionId: input.version.id,
      createdBy: input.actorUserId,
    });
    await this.repository.saveMutation({
      instance,
      event: event(instance, "workflow.instance.started", {
        entityType: instance.entityType,
        entityId: instance.entityId,
      }),
      audit: audit(instance, input.actorUserId, "workflow.instance.started", null, instance.status),
    });
    return instance;
  }

  async createTask(input: CreateTaskInput): Promise<WorkflowTask> {
    if (!["running", "waiting"].includes(input.instance.status))
      throw new InactiveWorkflowInstanceError();
    const oldStatus = input.instance.status;
    const task = new WorkflowTask({
      ...input,
      tenantId: input.instance.tenantId,
      organizationId: input.instance.organizationId,
      workflowInstanceId: input.instance.id,
    });
    input.instance.wait();
    await this.repository.saveMutation({
      instance: input.instance,
      task,
      event: event(input.instance, "workflow.task.created", {
        taskId: task.id,
        nodeKey: task.nodeKey,
      }),
      audit: audit(
        input.instance,
        input.actorUserId,
        "workflow.task.created",
        oldStatus,
        input.instance.status,
        task,
      ),
    });
    return task;
  }

  async decideApproval(input: {
    readonly instance: WorkflowInstance;
    readonly task: WorkflowTask;
    readonly actorUserId: UserId;
    readonly decision: ApprovalDecision;
    readonly comment?: string | null;
    readonly forbidSelfApproval?: boolean;
  }): Promise<WorkflowApproval> {
    assertTaskContext(input.instance, input.task);
    if (input.forbidSelfApproval && input.instance.requesterUserId === input.actorUserId) {
      throw new SeparationOfDutiesError();
    }
    if (input.task.assignedToUserId && input.task.assignedToUserId !== input.actorUserId) {
      throw new WorkflowTaskAssignmentError();
    }
    const oldStatus = input.task.status;
    input.task.decide(input.decision);
    const approval = new WorkflowApproval({
      tenantId: input.instance.tenantId,
      organizationId: input.instance.organizationId,
      workflowInstanceId: input.instance.id,
      workflowTaskId: input.task.id,
      decision: input.decision,
      decidedBy: input.actorUserId,
      comment: input.comment,
    });
    await this.repository.saveMutation({
      instance: input.instance,
      task: input.task,
      approval,
      event: event(
        input.instance,
        `workflow.task.${input.decision}` as "workflow.task.approved" | "workflow.task.rejected",
        { taskId: input.task.id },
      ),
      audit: audit(
        input.instance,
        input.actorUserId,
        `workflow.task.${input.decision}`,
        oldStatus,
        input.task.status,
        input.task,
      ),
    });
    return approval;
  }

  async complete(input: {
    readonly instance: WorkflowInstance;
    readonly actorUserId: UserId;
  }): Promise<void> {
    const oldStatus = input.instance.status;
    input.instance.complete();
    await this.repository.saveMutation({
      instance: input.instance,
      event: event(input.instance, "workflow.instance.completed"),
      audit: audit(
        input.instance,
        input.actorUserId,
        "workflow.instance.completed",
        oldStatus,
        input.instance.status,
      ),
    });
  }
}

function assertTaskContext(instance: WorkflowInstance, task: WorkflowTask): void {
  if (
    task.workflowInstanceId !== instance.id ||
    task.tenantId !== instance.tenantId ||
    task.organizationId !== instance.organizationId
  ) {
    throw new WorkflowTaskContextError();
  }
}
function event(
  instance: WorkflowInstance,
  eventType: ConstructorParameters<typeof WorkflowEvent>[0]["eventType"],
  payload: Record<string, unknown> = {},
): WorkflowEvent {
  return new WorkflowEvent({
    tenantId: instance.tenantId,
    organizationId: instance.organizationId,
    workflowInstanceId: instance.id,
    eventType,
    payload,
  });
}
function audit(
  instance: WorkflowInstance,
  actorUserId: UserId,
  action: string,
  oldStatus: string | null,
  newStatus: string | null,
  task?: WorkflowTask,
): WorkflowAuditLog {
  return new WorkflowAuditLog({
    tenantId: instance.tenantId,
    organizationId: instance.organizationId,
    workflowInstanceId: instance.id,
    workflowTaskId: task?.id,
    actorUserId,
    action,
    oldStatus,
    newStatus,
  });
}
export class UnpublishedWorkflowVersionError extends Error {
  constructor() {
    super("Workflow version must be published before execution.");
    this.name = "UnpublishedWorkflowVersionError";
  }
}
export class InactiveWorkflowInstanceError extends Error {
  constructor() {
    super("Workflow instance is not active.");
    this.name = "InactiveWorkflowInstanceError";
  }
}
export class SeparationOfDutiesError extends Error {
  constructor() {
    super("Requester cannot approve their own workflow request.");
    this.name = "SeparationOfDutiesError";
  }
}
export class WorkflowTaskAssignmentError extends Error {
  constructor() {
    super("Workflow task is assigned to another user.");
    this.name = "WorkflowTaskAssignmentError";
  }
}
export class WorkflowTaskContextError extends Error {
  constructor() {
    super("Workflow task does not belong to the workflow instance context.");
    this.name = "WorkflowTaskContextError";
  }
}
