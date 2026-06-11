import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import { WorkflowConditionEvaluator } from "./conditions.js";
import {
  SeparationOfDutiesError,
  UnpublishedWorkflowVersionError,
  WorkflowEngine,
} from "./engine.js";
import { WorkflowDefinition, WorkflowVersion } from "./entities.js";
import { workflowEventDefinitions } from "./events.js";

const tenantId = createEntityId<"tenant">();
const organizationId = createEntityId<"organization">();
const requester = createEntityId<"user">();
const approver = createEntityId<"user">();
const entityId = createEntityId<"invoice">();

function publishedVersion() {
  const workflow = new WorkflowDefinition({
    tenantId,
    organizationId,
    name: "Invoice approval",
    module: "finance",
    createdBy: requester,
  });
  const version = new WorkflowVersion({
    workflowId: workflow.id,
    version: 1,
    definition: { trigger: { type: "event" }, nodes: [{ key: "manager", type: "approval" }] },
    createdBy: requester,
  });
  version.publish();
  return version;
}
function repository() {
  return { saveMutation: vi.fn() };
}

describe("workflow definitions and versions", () => {
  it("publishes immutable execution versions", () => {
    const version = publishedVersion();
    expect(version.status).toBe("published");
    expect(() => version.publish()).toThrow("cannot transition");
  });
});

describe("WorkflowConditionEvaluator", () => {
  it("evaluates safe nested conditions without executing code", () => {
    const evaluator = new WorkflowConditionEvaluator();
    expect(
      evaluator.evaluate(
        { field: "invoice.total", operator: ">", value: 1000 },
        { invoice: { total: 2000 } },
      ),
    ).toBe(true);
    expect(
      evaluator.evaluate(
        { field: "invoice.tags", operator: "contains", value: "risk" },
        { invoice: { tags: ["risk"] } },
      ),
    ).toBe(true);
  });
});

describe("WorkflowEngine", () => {
  it("starts published versions and records event plus audit", async () => {
    const store = repository();
    const instance = await new WorkflowEngine(store).start({
      version: publishedVersion(),
      tenantId,
      organizationId,
      entityType: "finance.invoice",
      entityId,
      requesterUserId: requester,
      actorUserId: requester,
    });
    expect(instance.status).toBe("running");
    expect(store.saveMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ eventType: "workflow.instance.started" }),
        audit: expect.objectContaining({ action: "workflow.instance.started" }),
      }),
    );
  });

  it("rejects draft versions", async () => {
    const workflow = new WorkflowDefinition({
      tenantId,
      organizationId,
      name: "Draft",
      module: "finance",
      createdBy: requester,
    });
    const version = new WorkflowVersion({
      workflowId: workflow.id,
      version: 1,
      definition: { trigger: {}, nodes: [{ key: "start", type: "start" }] },
      createdBy: requester,
    });
    await expect(
      new WorkflowEngine(repository()).start({
        version,
        tenantId,
        organizationId,
        entityType: "finance.invoice",
        entityId,
        requesterUserId: requester,
        actorUserId: requester,
      }),
    ).rejects.toBeInstanceOf(UnpublishedWorkflowVersionError);
  });

  it("enforces separation of duties for approvals", async () => {
    const store = repository();
    const engine = new WorkflowEngine(store);
    const instance = await engine.start({
      version: publishedVersion(),
      tenantId,
      organizationId,
      entityType: "finance.invoice",
      entityId,
      requesterUserId: requester,
      actorUserId: requester,
    });
    const task = await engine.createTask({
      instance,
      nodeKey: "manager",
      taskType: "approval",
      title: "Approve",
      assignedToUserId: requester,
      actorUserId: requester,
    });
    await expect(
      engine.decideApproval({
        instance,
        task,
        actorUserId: requester,
        decision: "approved",
        forbidSelfApproval: true,
      }),
    ).rejects.toBeInstanceOf(SeparationOfDutiesError);
  });

  it("records an approval decision and workflow audit", async () => {
    const store = repository();
    const engine = new WorkflowEngine(store);
    const instance = await engine.start({
      version: publishedVersion(),
      tenantId,
      organizationId,
      entityType: "finance.invoice",
      entityId,
      requesterUserId: requester,
      actorUserId: requester,
    });
    const task = await engine.createTask({
      instance,
      nodeKey: "manager",
      taskType: "approval",
      title: "Approve",
      assignedToUserId: approver,
      actorUserId: requester,
    });
    const approval = await engine.decideApproval({
      instance,
      task,
      actorUserId: approver,
      decision: "approved",
      forbidSelfApproval: true,
    });
    expect(approval.decision).toBe("approved");
    expect(store.saveMutation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ eventType: "workflow.task.approved" }),
        audit: expect.objectContaining({ oldStatus: "pending", newStatus: "approved" }),
      }),
    );
  });
});

describe("workflow events", () => {
  it("registers the documented workflow event catalog", () => {
    expect(workflowEventDefinitions().map(({ eventType }) => eventType)).toContain(
      "workflow.instance.escalated",
    );
  });
});
