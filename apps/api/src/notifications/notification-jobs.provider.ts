import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { validateEnvironment } from "@tnvios/config";
import { BullMqJobQueue, JobRegistry, type JobQueue } from "@tnvios/jobs";
import { DELIVER_EMAIL_JOB, NotificationEngine } from "@tnvios/notifications";

import { NotificationsPersistence } from "./notifications.persistence.js";

@Injectable()
export class ApiNotificationEngine implements OnApplicationShutdown {
  #jobs?: JobQueue;
  #engine?: NotificationEngine;

  constructor(private readonly persistence: NotificationsPersistence) {}

  get(): NotificationEngine {
    this.#engine ??= new NotificationEngine(this.persistence, this.jobs());
    return this.#engine;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.#jobs?.close();
  }

  private jobs(): JobQueue {
    if (!this.#jobs) {
      const environment = validateEnvironment(process.env);
      const redis = new URL(environment.REDIS_URL);
      const registry = new JobRegistry();
      registry.register({
        name: DELIVER_EMAIL_JOB,
        queue: "email",
        validate: (data) => {
          if (typeof data.notificationId !== "string")
            throw new Error("notificationId is required.");
          return data;
        },
      });
      this.#jobs = new BullMqJobQueue(registry, {
        host: redis.hostname,
        password: redis.password || undefined,
        port: Number(redis.port || 6379),
        username: redis.username || undefined,
      });
    }
    return this.#jobs;
  }
}
