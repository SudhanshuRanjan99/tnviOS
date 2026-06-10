import { afterEach, describe, expect, it, vi } from "vitest";

import { apiLogger } from "./api-logger.js";
import { RequestLoggingMiddleware } from "./request-logging.middleware.js";

class TestResponse {
  readonly statusCode = 204;
  #finishListener: (() => void) | undefined;

  finish(): void {
    this.#finishListener?.();
  }

  once(event: "finish", listener: () => void): this {
    if (event === "finish") {
      this.#finishListener = listener;
    }

    return this;
  }
}

describe("RequestLoggingMiddleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs request completion without query values", () => {
    const info = vi.spyOn(apiLogger, "info").mockImplementation(() => undefined);
    const response = new TestResponse();

    new RequestLoggingMiddleware().use(
      {
        method: "GET",
        originalUrl: "/api/v1/resources?token=must-not-be-logged",
      },
      response,
      () => undefined,
    );
    response.finish();

    expect(info).toHaveBeenCalledWith(
      "HTTP request completed",
      expect.objectContaining({
        method: "GET",
        path: "/api/v1/resources",
        statusCode: 204,
      }),
    );
  });
});
