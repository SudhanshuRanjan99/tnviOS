export const WORKFLOW_CONDITION_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "contains",
  "exists",
  "=",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
] as const;
export type WorkflowConditionOperator = (typeof WORKFLOW_CONDITION_OPERATORS)[number];

export interface WorkflowCondition {
  readonly field: string;
  readonly operator: WorkflowConditionOperator;
  readonly value?: unknown;
}

export class WorkflowConditionEvaluator {
  evaluate(condition: WorkflowCondition, context: Readonly<Record<string, unknown>>): boolean {
    const actual = resolvePath(context, condition.field);
    switch (condition.operator) {
      case "eq":
      case "=":
        return Object.is(actual, condition.value);
      case "neq":
      case "!=":
        return !Object.is(actual, condition.value);
      case "gt":
      case ">":
        return comparable(actual, condition.value, (left, right) => left > right);
      case "gte":
      case ">=":
        return comparable(actual, condition.value, (left, right) => left >= right);
      case "lt":
      case "<":
        return comparable(actual, condition.value, (left, right) => left < right);
      case "lte":
      case "<=":
        return comparable(actual, condition.value, (left, right) => left <= right);
      case "in":
        return (
          Array.isArray(condition.value) &&
          condition.value.some((value) => Object.is(value, actual))
        );
      case "contains":
        return Array.isArray(actual)
          ? actual.some((value) => Object.is(value, condition.value))
          : typeof actual === "string" &&
              typeof condition.value === "string" &&
              actual.includes(condition.value);
      case "exists":
        return actual !== undefined && actual !== null;
    }
  }
}

function resolvePath(context: Readonly<Record<string, unknown>>, path: string): unknown {
  const parts = path.split(".");
  if (!parts.length || parts.some((part) => !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(part))) {
    throw new InvalidWorkflowConditionError();
  }
  let current: unknown = context;
  for (const part of parts) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}
function comparable(
  left: unknown,
  right: unknown,
  compare: (left: number | string, right: number | string) => boolean,
): boolean {
  if (typeof left === "number" && typeof right === "number") return compare(left, right);
  if (typeof left === "string" && typeof right === "string") return compare(left, right);
  return false;
}
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export class InvalidWorkflowConditionError extends Error {
  constructor() {
    super("Workflow condition field path is invalid.");
    this.name = "InvalidWorkflowConditionError";
  }
}
