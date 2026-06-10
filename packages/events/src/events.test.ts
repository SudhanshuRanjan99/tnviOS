import { describe, expect, it, vi } from "vitest";
import { IdempotentConsumerRunner } from "./consumer.js";
import { EventDefinition, OutboxEvent, toEventEnvelope } from "./entities.js";
import { OutboxWorker } from "./outbox-worker.js";
import { RedisStreamsPublisher } from "./publisher.js";
import { EventRegistry, UnregisteredEventError } from "./registry.js";

const event = new OutboxEvent({
  eventType: "crm.customer.created",
  source: "crm",
  payload: { name: "Acme" },
});
const envelope = toEventEnvelope(event);

describe("EventRegistry", () => {
  it("supports documented two-part and module-scoped event names", () => {
    expect(
      new OutboxEvent({
        eventType: "notification.created",
        source: "notifications",
        payload: {},
      }).eventType,
    ).toBe("notification.created");
    expect(event.eventType).toBe("crm.customer.created");
  });

  it("validates registered event versions and rejects unknown events", () => {
    const registry = new EventRegistry();
    registry.register(new EventDefinition({ eventType: event.eventType, publisher: "crm" }));
    expect(() => registry.validate(envelope)).not.toThrow();
    expect(() => new EventRegistry().validate(envelope)).toThrow(UnregisteredEventError);
  });
});
describe("RedisStreamsPublisher", () => {
  it("serializes canonical envelopes to the configured stream", async () => {
    const client = {
      isOpen: false,
      connect: vi.fn(async function (this: { isOpen: boolean }) {
        this.isOpen = true;
      }),
      quit: vi.fn(),
      xAdd: vi.fn(async () => "1-0"),
    };
    await expect(new RedisStreamsPublisher(client, "events").publish(envelope)).resolves.toBe(
      "1-0",
    );
    expect(client.xAdd).toHaveBeenCalledWith(
      "events",
      "*",
      expect.objectContaining({ eventId: event.id, eventType: event.eventType }),
    );
  });
});
describe("OutboxWorker", () => {
  it("publishes registered events and marks them published", async () => {
    const registry = new EventRegistry();
    registry.register(new EventDefinition({ eventType: event.eventType, publisher: "crm" }));
    const repository = {
      claim: vi.fn(async () => [event]),
      markPublished: vi.fn(),
      markFailed: vi.fn(),
    };
    const result = await new OutboxWorker(
      repository,
      { publish: vi.fn(async () => "1-0") },
      registry,
    ).runBatch();
    expect(result).toEqual({ claimed: 1, failed: 0, published: 1 });
    expect(repository.markPublished).toHaveBeenCalled();
  });
});
describe("IdempotentConsumerRunner", () => {
  it("delegates receipt and side-effect atomicity to the repository", async () => {
    const receipts = {
      runOnce: vi.fn(async (_receipt, work: () => Promise<void>) => {
        await work();
        return true;
      }),
    };
    const handle = vi.fn();
    await expect(
      new IdempotentConsumerRunner(receipts).consume({ name: "search", handle }, envelope),
    ).resolves.toEqual({ processed: true, reason: "PROCESSED" });
    receipts.runOnce.mockResolvedValue(false);
    await expect(
      new IdempotentConsumerRunner(receipts).consume({ name: "search", handle }, envelope),
    ).resolves.toEqual({ processed: false, reason: "DUPLICATE" });
    expect(handle).toHaveBeenCalledOnce();
  });
});
