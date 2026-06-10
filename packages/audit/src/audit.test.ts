import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it } from "vitest";
import { AuditLog, InvalidAuditFieldError } from "./index.js";
describe("AuditLog", () => {
  it("captures immutable mutation context and values", () => {
    expect(
      new AuditLog({
        tenantId: createEntityId(),
        organizationId: createEntityId(),
        userId: createEntityId(),
        entityType: "invoice",
        entityId: createEntityId(),
        action: "created",
        newValues: { amount: 10 },
        correlationId: createEntityId(),
      }),
    ).toMatchObject({ entityType: "invoice", action: "created", newValues: { amount: 10 } });
  });
  it("rejects empty actions", () => {
    expect(
      () =>
        new AuditLog({
          tenantId: createEntityId(),
          entityType: "invoice",
          action: " ",
          newValues: {},
        }),
    ).toThrow(InvalidAuditFieldError);
  });
});
