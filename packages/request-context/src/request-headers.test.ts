import { describe, expect, it } from "vitest";

import { createEntityId, isUuidV7 } from "@tnvios/database/identifiers";

import {
  createRequestContext,
  InvalidRequestContextHeaderError,
  REQUEST_HEADER_NAMES,
} from "./request-headers.js";

describe("createRequestContext", () => {
  it("parses tenant, organization, and hierarchy scope headers", () => {
    const tenantId = createEntityId<"tenant">();
    const organizationId = createEntityId<"organization">();
    const businessUnitId = createEntityId<"business_unit">();
    const departmentId = createEntityId<"department">();
    const teamId = createEntityId<"team">();

    expect(
      createRequestContext({
        [REQUEST_HEADER_NAMES.businessUnitId]: businessUnitId,
        [REQUEST_HEADER_NAMES.departmentId]: departmentId,
        [REQUEST_HEADER_NAMES.organizationId]: organizationId,
        [REQUEST_HEADER_NAMES.teamId]: teamId,
        [REQUEST_HEADER_NAMES.tenantId]: tenantId,
      }),
    ).toMatchObject({
      businessUnitId,
      departmentId,
      organizationId,
      teamId,
      tenantId,
    });
  });

  it("generates a UUIDv7 correlation ID when absent", () => {
    expect(isUuidV7(createRequestContext({}).correlationId)).toBe(true);
  });

  it("preserves a valid supplied correlation ID", () => {
    const correlationId = createEntityId<"correlation">();

    expect(
      createRequestContext({
        [REQUEST_HEADER_NAMES.correlationId]: correlationId,
      }).correlationId,
    ).toBe(correlationId);
  });

  it("rejects invalid and repeated context headers without echoing values", () => {
    const invalidValue = "not-a-uuid";

    for (const value of [invalidValue, [createEntityId<"tenant">(), createEntityId<"tenant">()]]) {
      try {
        createRequestContext({
          [REQUEST_HEADER_NAMES.tenantId]: value,
        });
        expect.fail("Expected request context parsing to fail");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidRequestContextHeaderError);
        expect(String(error)).not.toContain(invalidValue);
      }
    }
  });
});
