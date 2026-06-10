import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { AuditLog, AuditLogSchema } from "@tnvios/audit";
import { validateEnvironment } from "@tnvios/config";
import { closeMikroOrm, initializeMikroOrm, type TnviosMikroOrm } from "@tnvios/database";
import {
  ConsumerReceipt,
  EVENT_SCHEMAS,
  EventDefinition,
  EventRegistry,
  OutboxEvent,
  type ConsumerReceiptRepository,
  type OutboxRepository,
} from "@tnvios/events";
import { FILE_SCHEMAS } from "@tnvios/files";
import { UserSchema } from "@tnvios/identity/users";
import { ORGANIZATION_SCHEMAS } from "@tnvios/organization";
import { NOTIFICATION_SCHEMAS } from "@tnvios/notifications";
import { POLICY_SCHEMAS } from "@tnvios/policies";

@Injectable()
export class AuditEventsPersistence
  implements OnApplicationShutdown, OutboxRepository, ConsumerReceiptRepository
{
  #orm?: Promise<TnviosMikroOrm>;

  async recordMutation(entity: object, audit: AuditLog, event: OutboxEvent): Promise<void> {
    const em = (await this.#getOrm()).em.fork();
    await em.transactional(async (transactionalEm) => {
      transactionalEm.persist([entity, audit, event]);
      await transactionalEm.flush();
    });
  }

  async recordAuditEvent(audit: AuditLog, event: OutboxEvent): Promise<void> {
    const em = (await this.#getOrm()).em.fork();
    await em.transactional(async (transactionalEm) => {
      transactionalEm.persist([audit, event]);
      await transactionalEm.flush();
    });
  }

  async save(entity: object): Promise<void> {
    const em = (await this.#getOrm()).em.fork();
    em.persist(entity);
    await em.flush();
  }

  async list<Entity extends object>(
    type: { new (...args: never[]): Entity },
    where: object = {},
  ): Promise<Entity[]> {
    return (await this.#getOrm()).em.fork().find(type, where as never);
  }

  async loadRegistry(): Promise<EventRegistry> {
    const registry = new EventRegistry();
    for (const definition of await this.list(EventDefinition)) registry.register(definition);
    return registry;
  }

  async claim(limit: number, now: Date): Promise<OutboxEvent[]> {
    const em = (await this.#getOrm()).em.fork();
    return em.transactional(async (transactionalEm) => {
      const rows = await transactionalEm.getConnection().execute<Array<Record<string, unknown>>>(
        `update outbox_events
         set status = 'publishing'
         where id in (
           select id from outbox_events
           where status in ('pending', 'failed') and available_at <= ?
           order by created_at asc
           for update skip locked
           limit ?
         )
         returning *`,
        [now, limit],
      );
      return rows.map((row) => transactionalEm.map(OutboxEvent, row));
    });
  }

  async markPublished(event: OutboxEvent, at: Date): Promise<void> {
    event.markPublished(at);
    await this.save(event);
  }

  async markFailed(event: OutboxEvent, retryAt: Date): Promise<void> {
    event.status = "failed";
    event.availableAt = retryAt;
    await this.save(event);
  }

  async runOnce(receipt: ConsumerReceipt, work: () => Promise<void>): Promise<boolean> {
    const em = (await this.#getOrm()).em.fork();
    try {
      return await em.transactional(async (transactionalEm) => {
        transactionalEm.persist(receipt);
        await transactionalEm.flush();
        await work();
        return true;
      });
    } catch (error) {
      if (error instanceof Error && error.name === "UniqueConstraintViolationException")
        return false;
      throw error;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.#orm) await closeMikroOrm(await this.#orm);
  }

  #getOrm(): Promise<TnviosMikroOrm> {
    this.#orm ??= initializeMikroOrm({
      debug: false,
      entities: [
        UserSchema,
        ...ORGANIZATION_SCHEMAS,
        ...POLICY_SCHEMAS,
        ...NOTIFICATION_SCHEMAS,
        ...FILE_SCHEMAS,
        AuditLogSchema,
        ...EVENT_SCHEMAS,
      ],
      environment: validateEnvironment(process.env),
    });
    return this.#orm;
  }
}

export { AuditLog, EventDefinition, OutboxEvent };
