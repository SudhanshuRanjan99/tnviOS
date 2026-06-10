import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it } from "vitest";
import { PermissionEvaluator, ScopeEvaluator } from "./evaluator.js";

const userId = createEntityId<"user">();
const context = {
  tenantId: createEntityId<"tenant">(),
  organizationId: createEntityId<"organization">(),
  businessUnitId: createEntityId<"business_unit">(),
  departmentId: createEntityId<"department">(),
  teamId: createEntityId<"team">(),
  membershipId: createEntityId<"membership">(),
  userId,
};
const request = { permissionCode: "finance.invoice.read", context };

describe("ScopeEvaluator", () => {
  it("matches hierarchy and personal scopes only inside the resolved context", () => {
    const scopes = new ScopeEvaluator();
    expect(
      scopes.matches(
        {
          permissionCode: request.permissionCode,
          scopeLevel: "department",
          scopeId: context.departmentId,
        },
        request,
      ),
    ).toBe(true);
    expect(
      scopes.matches(
        {
          permissionCode: request.permissionCode,
          scopeLevel: "team",
          scopeId: createEntityId<"team">(),
        },
        request,
      ),
    ).toBe(false);
    expect(
      scopes.matches(
        { permissionCode: request.permissionCode, scopeLevel: "personal", scopeId: null },
        { ...request, resource: { id: createEntityId(), type: "invoice", ownerUserId: userId } },
      ),
    ).toBe(true);
  });
});

describe("PermissionEvaluator", () => {
  const grant = {
    permissionCode: request.permissionCode,
    scopeLevel: "organization" as const,
    scopeId: null,
  };
  it("defaults to deny without a matching scoped role permission", () => {
    expect(new PermissionEvaluator().evaluate(request, [])).toEqual({
      allowed: false,
      reason: "NO_MATCHING_ROLE_PERMISSION",
    });
  });
  it("allows a matching role permission and scope", () => {
    expect(new PermissionEvaluator().evaluate(request, [grant])).toMatchObject({
      allowed: true,
      reason: "ROLE_PERMISSION_SCOPE_MATCH",
    });
  });
  it("gives explicit record deny precedence over role grants", () => {
    expect(new PermissionEvaluator().evaluate(request, [grant], "deny")).toEqual({
      allowed: false,
      reason: "EXPLICIT_RECORD_DENY",
    });
  });
  it("allows an explicit record grant when no role grant matches", () => {
    expect(new PermissionEvaluator().evaluate(request, [], "allow")).toEqual({
      allowed: true,
      reason: "EXPLICIT_RECORD_ALLOW",
    });
  });
});
