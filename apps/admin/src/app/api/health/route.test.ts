import { describe, expect, it } from "vitest";

import { GET } from "./route.js";

describe("GET /api/health", () => {
  it("returns the standard admin health response", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        service: "admin",
        status: "ok",
      },
      meta: {},
      success: true,
    });
  });
});
