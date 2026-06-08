import { describe, expect, it } from "vitest";

import {
  DEFAULT_API_HOST,
  DEFAULT_API_PORT,
  getApiRuntimeOptions,
  InvalidApiPortError,
  parseApiPort,
} from "./application.js";

describe("API runtime options", () => {
  it("uses stable local defaults", () => {
    expect(getApiRuntimeOptions({})).toEqual({
      host: DEFAULT_API_HOST,
      port: DEFAULT_API_PORT,
    });
  });

  it("accepts explicit host and port values", () => {
    expect(
      getApiRuntimeOptions({
        API_HOST: "127.0.0.1",
        API_PORT: "4100",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 4100,
    });
  });

  it("rejects invalid ports", () => {
    expect(() => parseApiPort("not-a-port")).toThrowError(InvalidApiPortError);
    expect(() => parseApiPort("0")).toThrowError(InvalidApiPortError);
    expect(() => parseApiPort("65536")).toThrowError(InvalidApiPortError);
  });
});
