export const WORKFLOW_EVENT_TYPES = [
  "workflow.instance.started",
  "workflow.task.created",
  "workflow.task.approved",
  "workflow.task.rejected",
  "workflow.instance.completed",
  "workflow.instance.failed",
  "workflow.instance.escalated",
] as const;
export type WorkflowEventType = (typeof WORKFLOW_EVENT_TYPES)[number];

export interface WorkflowEventDefinition {
  readonly eventType: WorkflowEventType;
  readonly version: 1;
  readonly description: string;
}

export function workflowEventDefinitions(): readonly WorkflowEventDefinition[] {
  return WORKFLOW_EVENT_TYPES.map((eventType) => ({
    eventType,
    version: 1,
    description: eventType.replaceAll(".", " "),
  }));
}
