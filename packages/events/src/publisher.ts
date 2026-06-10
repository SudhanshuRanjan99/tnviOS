import { createClient, type RedisClientType } from "redis";
import type { EventEnvelope } from "./entities.js";

export const DEFAULT_EVENT_STREAM = "tnvios:events";
export interface EventPublisher {
  publish(event: EventEnvelope): Promise<string>;
}
export interface RedisStreamClient {
  xAdd(key: string, id: "*", message: Record<string, string>): Promise<string | null>;
  connect(): Promise<unknown>;
  quit(): Promise<unknown>;
  isOpen: boolean;
}

export class RedisStreamsPublisher implements EventPublisher {
  constructor(
    private readonly client: RedisStreamClient,
    private readonly stream = DEFAULT_EVENT_STREAM,
  ) {}
  async publish(event: EventEnvelope): Promise<string> {
    if (!this.client.isOpen) await this.client.connect();
    const id = await this.client.xAdd(this.stream, "*", {
      event: JSON.stringify(event),
      eventId: event.eventId,
      eventType: event.eventType,
    });
    if (id === null) throw new RedisStreamPublishError();
    return id;
  }
  async close(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }
}
export function createRedisStreamsPublisher(
  redisUrl: string,
  stream = DEFAULT_EVENT_STREAM,
): RedisStreamsPublisher {
  return new RedisStreamsPublisher(
    createClient({ url: redisUrl }) as RedisClientType as RedisStreamClient,
    stream,
  );
}
export class RedisStreamPublishError extends Error {
  constructor() {
    super("Redis Streams did not return a message ID.");
    this.name = "RedisStreamPublishError";
  }
}
