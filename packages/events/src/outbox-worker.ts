import { toEventEnvelope, type OutboxEvent } from "./entities.js";
import type { EventPublisher } from "./publisher.js";
import type { EventRegistry } from "./registry.js";

export interface OutboxRepository {
  claim(limit: number, now: Date): Promise<OutboxEvent[]>;
  markPublished(event: OutboxEvent, at: Date): Promise<void>;
  markFailed(event: OutboxEvent, retryAt: Date): Promise<void>;
}
export interface OutboxWorkerResult {
  claimed: number;
  failed: number;
  published: number;
}

export class OutboxWorker {
  constructor(
    private readonly repository: OutboxRepository,
    private readonly publisher: EventPublisher,
    private readonly registry: EventRegistry,
    private readonly retryDelayMs = 5_000,
  ) {}
  async runBatch(limit = 100, now = new Date()): Promise<OutboxWorkerResult> {
    const events = await this.repository.claim(limit, now);
    let published = 0;
    let failed = 0;
    for (const event of events) {
      try {
        const envelope = toEventEnvelope(event);
        this.registry.validate(envelope);
        await this.publisher.publish(envelope);
        event.markPublished(now);
        await this.repository.markPublished(event, now);
        published += 1;
      } catch {
        const retryAt = new Date(now.getTime() + this.retryDelayMs * 2 ** event.attempts);
        event.markFailed(retryAt);
        await this.repository.markFailed(event, retryAt);
        failed += 1;
      }
    }
    return { claimed: events.length, failed, published };
  }
}
