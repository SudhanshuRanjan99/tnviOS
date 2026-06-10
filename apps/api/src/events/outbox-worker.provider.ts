import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { validateEnvironment } from "@tnvios/config";
import { createRedisStreamsPublisher, OutboxWorker, type OutboxWorkerResult } from "@tnvios/events";
import { AuditEventsPersistence } from "./audit-events.persistence.js";

@Injectable()
export class ApiOutboxWorker implements OnApplicationShutdown {
  #publisher?: ReturnType<typeof createRedisStreamsPublisher>;

  constructor(private readonly persistence: AuditEventsPersistence) {}

  async runBatch(limit = 100): Promise<OutboxWorkerResult> {
    this.#publisher ??= createRedisStreamsPublisher(validateEnvironment(process.env).REDIS_URL);
    return new OutboxWorker(
      this.persistence,
      this.#publisher,
      await this.persistence.loadRegistry(),
    ).runBatch(limit);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.#publisher?.close();
  }
}
