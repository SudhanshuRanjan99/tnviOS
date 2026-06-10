import { createRequestContext } from "@tnvios/request-context";
import { describe, expect, it } from "vitest";

import { createRequestContextAttributes } from "./request-telemetry.js";

describe("createRequestContextAttributes", () => {
  it("maps request context to span attributes", () => {
    const context = createRequestContext({});

    expect(createRequestContextAttributes(context)).toEqual({
      "tnvios.business_unit.id": undefined,
      "tnvios.correlation.id": context.correlationId,
      "tnvios.department.id": undefined,
      "tnvios.organization.id": undefined,
      "tnvios.team.id": undefined,
      "tnvios.tenant.id": undefined,
    });
  });
});
