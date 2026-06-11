import { EventDefinition } from "@tnvios/events";
import type { JobDefinition } from "@tnvios/jobs";

export const sharedServiceEventDefinitions = [
  "onboarding.flow.started",
  "onboarding.step.completed",
  "onboarding.flow.completed",
  "help.tour.started",
  "help.tour.completed",
  "activity.event.created",
  "comment.created",
  "comment.mention.created",
  "import.job.created",
  "import.job.completed",
  "export.job.created",
  "export.job.completed",
  "inbound_email.message.received",
].map((eventType) => new EventDefinition({ eventType, publisher: "shared-services" }));

export const sharedServiceJobDefinitions: readonly JobDefinition[] = [
  { name: "shared.import.run", queue: "imports" },
  { name: "shared.export.run", queue: "exports" },
  { name: "shared.inbound-email.process", queue: "email" },
];
