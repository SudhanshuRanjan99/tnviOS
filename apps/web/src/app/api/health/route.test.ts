import { describe, expect, it } from "vitest";

import { GET } from "./route.js";

describe("GET /api/health", () => {
  it("returns the standard web health response", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        service: "web",
        status: "ok",
      },
      meta: {},
      success: true,
    });
  });
});
