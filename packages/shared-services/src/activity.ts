import { createEntityId, type EntityId } from "@tnvios/database/identifiers";

import {
  key,
  required,
  type EntityReference,
  type MutationRepository,
  type ServiceContext,
} from "./contracts.js";

export class ActivityEvent {
  readonly id: EntityId<"activity_event"> = createEntityId();
  readonly createdAt = new Date();
  constructor(
    readonly context: ServiceContext,
    readonly target: EntityReference,
    readonly activityType: string,
    readonly title: string,
    readonly visibilityPrincipals: readonly string[],
    readonly metadata: Readonly<Record<string, unknown>> = {},
  ) {
    this.activityType = key(activityType, "activityType");
    this.title = required(title, "activity.title");
    if (!visibilityPrincipals.length) throw new Error("Activity visibility is required.");
  }
}
export class ActivityFeedEngine {
  constructor(private readonly repository: MutationRepository<ActivityEvent>) {}
  async record(input: ConstructorParameters<typeof ActivityEvent>): Promise<ActivityEvent> {
    const activity = new ActivityEvent(...input);
    await this.repository.save(activity, {
      eventType: "activity.event.created",
      aggregateType: activity.target.entityType,
      aggregateId: activity.target.entityId,
      payload: {
        activityId: activity.id,
        activityType: activity.activityType,
        title: activity.title,
      },
    });
    return activity;
  }
  filterVisible(events: readonly ActivityEvent[], principals: readonly string[]): ActivityEvent[] {
    const allowed = new Set(principals);
    return events.filter(({ visibilityPrincipals }) =>
      visibilityPrincipals.some((principal) => allowed.has(principal)),
    );
  }
}
