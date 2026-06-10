import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";
import { setResolvedOrganizationContext } from "../organization/resolved-context.js";
import { AuthorizationGuard } from "./authorization.guard.js";
import type { PolicyPersistence } from "./policy.persistence.js";

const context = {
  tenantId: createEntityId<"tenant">(),
  organizationId: createEntityId<"organization">(),
  businessUnitId: null,
  departmentId: null,
  teamId: null,
  membershipId: createEntityId<"membership">(),
  userId: createEntityId<"user">(),
};

describe("AuthorizationGuard", () => {
  it("allows routes without an explicit permission requirement", async () => {
    const { guard, policies } = createGuard(undefined, false);
    await expect(guard.canActivate(executionContext({}))).resolves.toBe(true);
    expect(policies.evaluate).not.toHaveBeenCalled();
  });
  it("allows an explicitly granted permission", async () => {
    const request = {};
    setResolvedOrganizationContext(request, context);
    const { guard, policies } = createGuard("finance.invoice.read", true);
    await expect(guard.canActivate(executionContext(request))).resolves.toBe(true);
    expect(policies.evaluate).toHaveBeenCalledWith({
      permissionCode: "finance.invoice.read",
      context,
    });
  });
  it("denies a rejected permission decision", async () => {
    const request = {};
    setResolvedOrganizationContext(request, context);
    const { guard } = createGuard("finance.invoice.read", false);
    await expect(guard.canActivate(executionContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
function createGuard(permission: string | undefined, allowed: boolean) {
  const reflector = { getAllAndOverride: vi.fn(() => permission) } as unknown as Reflector;
  const policies = {
    evaluate: vi.fn(async () => ({ allowed, reason: allowed ? "MATCH" : "DENY" })),
  } as unknown as PolicyPersistence;
  return { guard: new AuthorizationGuard(reflector, policies), policies };
}
function executionContext(request: object): ExecutionContext {
  return {
    getClass: vi.fn(),
    getHandler: vi.fn(),
    switchToHttp: vi.fn(() => ({ getRequest: () => request })),
  } as unknown as ExecutionContext;
}
