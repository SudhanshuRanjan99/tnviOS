import { describe, expect, it, vi } from "vitest";

import {
  BullMqJobQueue,
  DuplicateJobDefinitionError,
  JobRegistry,
  UnregisteredJobError,
} from "./index.js";

describe("JobRegistry", () => {
  it("registers definitions and rejects duplicates or unknown jobs", () => {
    const registry = new JobRegistry();
    registry.register({ name: "notification.email.deliver", queue: "email" });
    expect(registry.require("notification.email.deliver").queue).toBe("email");
    expect(() => registry.register({ name: "notification.email.deliver", queue: "email" })).toThrow(
      DuplicateJobDefinitionError,
    );
    expect(() => registry.require("missing")).toThrow(UnregisteredJobError);
  });
});

describe("BullMqJobQueue", () => {
  it("rejects unregistered jobs before connecting to Redis", async () => {
    const queue = new BullMqJobQueue(new JobRegistry(), { host: "localhost", port: 6379 });
    await expect(queue.enqueue("missing", {})).rejects.toBeInstanceOf(UnregisteredJobError);
    await queue.close();
  });

  it("validates payloads before enqueueing", async () => {
    const registry = new JobRegistry();
    const validate = vi.fn(() => {
      throw new Error("invalid");
    });
    registry.register({ name: "notification.email.deliver", queue: "email", validate });
    const queue = new BullMqJobQueue(registry, { host: "localhost", port: 6379 });
    await expect(queue.enqueue("notification.email.deliver", {})).rejects.toThrow("invalid");
    expect(validate).toHaveBeenCalledOnce();
    await queue.close();
  });
});
