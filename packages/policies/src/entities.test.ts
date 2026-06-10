import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it } from "vitest";
import { InvalidPolicyFieldError, Permission, Role } from "./entities.js";

describe("policy entities", () => {
  it("normalizes and decomposes permission codes", () => {
    expect(new Permission({ code: "Finance.Invoice.Read", name: "Read invoice" })).toMatchObject({
      code: "finance.invoice.read",
      module: "finance",
      resource: "invoice",
      action: "read",
    });
  });
  it("rejects malformed permission codes", () => {
    expect(() => new Permission({ code: "invoice.read", name: "Read" })).toThrow(
      InvalidPolicyFieldError,
    );
  });
  it("creates organization-scoped roles", () => {
    expect(
      new Role({
        tenantId: createEntityId(),
        organizationId: createEntityId(),
        name: "Finance",
        scopeLevel: "department",
      }),
    ).toMatchObject({ name: "Finance", scopeLevel: "department", status: "active" });
  });
});
