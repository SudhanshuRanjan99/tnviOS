import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createEntityId } from "@tnvios/database/identifiers";
import { requestContextStore, type RequestContext } from "@tnvios/request-context";
import { describe, expect, it, vi } from "vitest";

import { setAuthenticatedIdentity } from "../auth/authenticated-request.js";
import type { OrganizationContextLevel } from "./context.decorator.js";
import { OrganizationContextGuard } from "./organization-context.guard.js";
import type { OrganizationPersistence } from "./organization.persistence.js";
import { getResolvedOrganizationContext } from "./resolved-context.js";

const userId = createEntityId<"user">();
const tenantId = createEntityId<"tenant">();
const organizationId = createEntityId<"organization">();
const context: RequestContext = {
  tenantId,
  organizationId,
  businessUnitId: null,
  departmentId: null,
  teamId: null,
  correlationId: createEntityId<"correlation">(),
};

describe("OrganizationContextGuard", () => {
  it("rejects tenant-level access without an active tenant membership", async () => {
    const { guard } = createGuard("tenant", { userHasTenantAccess: vi.fn(async () => false) });
    await expect(run(guard)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("resolves exact organization membership and attaches the validated context", async () => {
    const request = authenticatedRequest();
    const resolved = {
      ...context,
      membershipId: createEntityId<"membership">(),
      userId,
      tenantId,
      organizationId,
    };
    const { guard, persistence } = createGuard("organization", {
      resolve: vi.fn(async () => resolved),
    });

    await expect(run(guard, request)).resolves.toBe(true);
    expect(persistence.resolve).toHaveBeenCalledWith(userId, context);
    expect(getResolvedOrganizationContext(request)).toEqual(resolved);
  });

  it("skips context checks only for explicitly marked bootstrap routes", async () => {
    const { guard, persistence } = createGuard("none");
    await expect(guard.canActivate(executionContext(authenticatedRequest()))).resolves.toBe(true);
    expect(persistence.tenantExists).not.toHaveBeenCalled();
  });
});

function createGuard(level: OrganizationContextLevel, overrides: Record<string, unknown> = {}) {
  const reflector = { getAllAndOverride: vi.fn(() => level) } as unknown as Reflector;
  const persistence = {
    tenantExists: vi.fn(async () => true),
    userHasTenantAccess: vi.fn(async () => true),
    resolve: vi.fn(),
    ...overrides,
  } as unknown as OrganizationPersistence;
  return { guard: new OrganizationContextGuard(reflector, persistence), persistence };
}

function authenticatedRequest() {
  const request = {};
  setAuthenticatedIdentity(request, {
    principal: { keycloakUserId: "keycloak-user" },
    status: "active",
    userId,
  });
  return request;
}

function run(guard: OrganizationContextGuard, request = authenticatedRequest()) {
  return requestContextStore.run(context, () => guard.canActivate(executionContext(request)));
}

function executionContext(request: object): ExecutionContext {
  return {
    getClass: vi.fn(),
    getHandler: vi.fn(),
    switchToHttp: vi.fn(() => ({ getRequest: () => request })),
  } as unknown as ExecutionContext;
}
