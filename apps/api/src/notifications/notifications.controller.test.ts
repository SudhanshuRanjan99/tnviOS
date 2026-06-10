import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import { setResolvedOrganizationContext } from "../organization/resolved-context.js";
import {
  InternalNotificationsController,
  NotificationsController,
} from "./notifications.controller.js";
import type { NotificationsService } from "./notifications.service.js";

const context = {
  tenantId: createEntityId<"tenant">(),
  organizationId: createEntityId<"organization">(),
  businessUnitId: null,
  departmentId: null,
  teamId: null,
  membershipId: createEntityId<"membership">(),
  userId: createEntityId<"user">(),
};

describe("notifications controllers", () => {
  it("scopes inbox reads to the resolved user context", async () => {
    const service = { inbox: vi.fn(async () => []) } as unknown as NotificationsService;
    const request = {};
    setResolvedOrganizationContext(request, context);
    await new NotificationsController(service).inbox(request);
    expect(service.inbox).toHaveBeenCalledWith(context);
  });

  it("sends notifications through the internal engine endpoint", async () => {
    const service = { send: vi.fn(async () => []) } as unknown as NotificationsService;
    const input = {
      tenantId: context.tenantId,
      userId: context.userId,
      templateKey: "welcome",
      channels: ["in-app" as const],
      variables: {},
    };
    await new InternalNotificationsController(service).send(input);
    expect(service.send).toHaveBeenCalledWith(input);
  });
});
