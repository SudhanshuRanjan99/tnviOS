import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import {
  OrganizationContextResolutionError,
  OrganizationContextResolver,
} from "./context-resolver.js";
import { Membership } from "./entities.js";

const tenantId = createEntityId<"tenant">();
const organizationId = createEntityId<"organization">();
const userId = createEntityId<"user">();
const membership = new Membership({ tenantId, organizationId, userId, memberType: "employee" });
const input = { tenantId, organizationId, businessUnitId: null, departmentId: null, teamId: null };

describe("OrganizationContextResolver", () => {
  it("resolves an active membership in the requested tenant and organization", async () => {
    const resolver = new OrganizationContextResolver(repository());
    await expect(resolver.resolve(userId, input)).resolves.toMatchObject({
      tenantId,
      organizationId,
      userId,
      membershipId: membership.id,
    });
  });

  it.each([
    ["missing tenant", { ...input, tenantId: null }, "TENANT_CONTEXT_REQUIRED"],
    ["missing organization", { ...input, organizationId: null }, "ORGANIZATION_CONTEXT_REQUIRED"],
  ] as const)("rejects %s context", async (_name, context, code) => {
    const resolver = new OrganizationContextResolver(repository());
    await expect(resolver.resolve(userId, context)).rejects.toMatchObject({ code });
  });

  it("rejects users without an active membership", async () => {
    const resolver = new OrganizationContextResolver(
      repository({ findActiveMembership: vi.fn(async () => null) }),
    );
    await expect(resolver.resolve(userId, input)).rejects.toBeInstanceOf(
      OrganizationContextResolutionError,
    );
    await expect(resolver.resolve(userId, input)).rejects.toMatchObject({
      code: "MEMBERSHIP_REQUIRED",
    });
  });

  it("rejects hierarchy IDs from another organization", async () => {
    const resolver = new OrganizationContextResolver(
      repository({ hierarchyBelongsToOrganization: vi.fn(async () => false) }),
    );
    await expect(resolver.resolve(userId, input)).rejects.toMatchObject({
      code: "INVALID_HIERARCHY_CONTEXT",
    });
  });
});

function repository(overrides: Record<string, unknown> = {}) {
  return {
    tenantExists: vi.fn(async () => true),
    organizationBelongsToTenant: vi.fn(async () => true),
    findActiveMembership: vi.fn(async () => membership),
    hierarchyBelongsToOrganization: vi.fn(async () => true),
    ...overrides,
  };
}
