import { describe, expect, it } from "vitest";

import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("returns the standard API success envelope", () => {
    expect(new HealthController().getHealth()).toEqual({
      data: {
        service: "api",
        status: "ok",
      },
      meta: {},
      success: true,
    });
  });
});
