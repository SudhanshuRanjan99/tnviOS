import { describe, expect, it } from "vitest";

import { SharedServicesController } from "./shared-services.controller.js";

describe("SharedServicesController", () => {
  it("exposes registered platform capabilities", () => {
    expect(new SharedServicesController().capabilities()).toMatchObject({
      data: {
        engines: expect.arrayContaining(["onboarding", "inbound-email"]),
        jobs: expect.arrayContaining([{ name: "shared.import.run", queue: "imports" }]),
      },
    });
  });
});
