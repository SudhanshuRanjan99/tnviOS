import { describe, expect, it, vi } from "vitest";

import {
  checkTypesenseHealth,
  createTypesenseConfiguration,
  InvalidTypesenseConfigurationError,
} from "./typesense.js";

describe("Typesense configuration", () => {
  it("creates a local HTTP node configuration", () => {
    expect(
      createTypesenseConfiguration({
        apiKey: "local-key",
        host: "http://localhost:8108",
      }),
    ).toMatchObject({
      apiKey: "local-key",
      nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
      connectionTimeoutSeconds: 5,
      numRetries: 3,
      retryIntervalSeconds: 1,
    });
  });

  it("uses the default HTTPS port", () => {
    expect(
      createTypesenseConfiguration({ apiKey: "key", host: "https://search.example.com" }).nodes,
    ).toEqual([{ host: "search.example.com", port: 443, protocol: "https" }]);
  });

  it("rejects unsafe or incomplete configuration", () => {
    expect(() =>
      createTypesenseConfiguration({ apiKey: "", host: "http://localhost:8108" }),
    ).toThrow(InvalidTypesenseConfigurationError);
    expect(() =>
      createTypesenseConfiguration({ apiKey: "key", host: "http://localhost:8108/path" }),
    ).toThrow(InvalidTypesenseConfigurationError);
  });
});

describe("Typesense health", () => {
  it("returns a healthy response", async () => {
    const retrieve = vi.fn(async () => ({ ok: true }));
    await expect(checkTypesenseHealth({ health: { retrieve } })).resolves.toEqual({ ok: true });
    expect(retrieve).toHaveBeenCalledOnce();
  });

  it("rejects an unhealthy response", async () => {
    await expect(
      checkTypesenseHealth({ health: { retrieve: vi.fn(async () => ({ ok: false })) } }),
    ).rejects.toThrow("unhealthy");
  });
});
