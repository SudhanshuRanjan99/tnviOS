import { createEntityId, type EntityId } from "@tnvios/database/identifiers";

import { key, required, type MutationRepository, type ServiceContext } from "./contracts.js";

export interface OnboardingStepDefinition {
  readonly key: string;
  readonly title: string;
  readonly required?: boolean;
}
export interface OnboardingFlowDefinition {
  readonly key: string;
  readonly audience: string;
  readonly steps: readonly OnboardingStepDefinition[];
}
export class OnboardingProgress {
  readonly id: EntityId<"onboarding_progress"> = createEntityId();
  readonly completedSteps = new Set<string>();
  status: "active" | "completed" | "cancelled" = "active";
  completedAt: Date | null = null;
  constructor(
    readonly context: ServiceContext,
    readonly flow: OnboardingFlowDefinition,
  ) {}
}
export class OnboardingRegistry {
  readonly #flows = new Map<string, OnboardingFlowDefinition>();
  register(flow: OnboardingFlowDefinition): void {
    const flowKey = key(flow.key, "onboarding.flow.key");
    if (this.#flows.has(flowKey)) throw new DuplicateOnboardingFlowError(flowKey);
    const steps = flow.steps.map((step) => ({
      ...step,
      key: key(step.key, "onboarding.step.key"),
    }));
    if (!steps.length || new Set(steps.map(({ key: stepKey }) => stepKey)).size !== steps.length)
      throw new Error("Onboarding flows require unique steps.");
    this.#flows.set(flowKey, {
      ...flow,
      key: flowKey,
      audience: key(flow.audience, "audience"),
      steps,
    });
  }
  require(flowKey: string): OnboardingFlowDefinition {
    const flow = this.#flows.get(flowKey);
    if (!flow) throw new Error(`Onboarding flow "${flowKey}" is not registered.`);
    return flow;
  }
}
export class OnboardingEngine {
  constructor(
    private readonly registry: OnboardingRegistry,
    private readonly repository: MutationRepository<OnboardingProgress>,
  ) {}
  async start(context: ServiceContext, flowKey: string): Promise<OnboardingProgress> {
    const progress = new OnboardingProgress(context, this.registry.require(flowKey));
    await this.repository.save(progress, {
      eventType: "onboarding.flow.started",
      aggregateType: "onboarding_progress",
      aggregateId: progress.id,
      payload: { flowKey: progress.flow.key },
    });
    return progress;
  }
  async completeStep(progress: OnboardingProgress, stepKey: string): Promise<void> {
    if (progress.status !== "active") throw new Error("Onboarding flow is not active.");
    const step = progress.flow.steps.find(({ key: candidate }) => candidate === stepKey);
    if (!step) throw new Error(`Onboarding step "${stepKey}" is not part of this flow.`);
    progress.completedSteps.add(step.key);
    const requiredSteps = progress.flow.steps.filter(
      ({ required: isRequired = true }) => isRequired,
    );
    if (requiredSteps.every(({ key: requiredKey }) => progress.completedSteps.has(requiredKey))) {
      progress.status = "completed";
      progress.completedAt = new Date();
    }
    await this.repository.save(progress, {
      eventType:
        progress.status === "completed" ? "onboarding.flow.completed" : "onboarding.step.completed",
      aggregateType: "onboarding_progress",
      aggregateId: progress.id,
      payload: { flowKey: progress.flow.key, stepKey: step.key },
    });
  }
}
export class DuplicateOnboardingFlowError extends Error {
  constructor(flowKey: string) {
    super(`Onboarding flow "${required(flowKey, "flowKey")}" is already registered.`);
    this.name = "DuplicateOnboardingFlowError";
  }
}
