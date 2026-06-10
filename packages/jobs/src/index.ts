import {
  Queue,
  Worker,
  type ConnectionOptions,
  type JobsOptions,
  type Processor,
  type QueueOptions,
  type WorkerOptions,
} from "bullmq";

export const JOB_QUEUES = [
  "email",
  "notifications",
  "files",
  "imports",
  "exports",
  "search-indexing",
  "ai-embeddings",
  "reports",
  "webhooks",
  "audit-processing",
  "workflow-timers",
] as const;
export type JobQueueName = (typeof JOB_QUEUES)[number];

export interface JobDefinition<Data extends Record<string, unknown> = Record<string, unknown>> {
  readonly name: string;
  readonly queue: JobQueueName;
  readonly options?: JobsOptions;
  readonly validate?: (data: Record<string, unknown>) => Data;
}

export class JobRegistry {
  readonly #definitions = new Map<string, JobDefinition>();

  register<Data extends Record<string, unknown>>(definition: JobDefinition<Data>): void {
    const name = required(definition.name);
    if (this.#definitions.has(name)) throw new DuplicateJobDefinitionError(name);
    this.#definitions.set(name, { ...definition, name });
  }

  get(name: string): JobDefinition | undefined {
    return this.#definitions.get(name);
  }

  require(name: string): JobDefinition {
    const definition = this.get(name);
    if (!definition) throw new UnregisteredJobError(name);
    return definition;
  }

  list(): readonly JobDefinition[] {
    return [...this.#definitions.values()];
  }
}

export interface EnqueueJobResult {
  readonly id: string;
  readonly name: string;
  readonly queue: JobQueueName;
}

export interface JobQueue {
  enqueue(
    name: string,
    data: Record<string, unknown>,
    options?: JobsOptions,
  ): Promise<EnqueueJobResult>;
  close(): Promise<void>;
}

export class BullMqJobQueue implements JobQueue {
  readonly #queues = new Map<JobQueueName, Queue>();

  constructor(
    private readonly registry: JobRegistry,
    private readonly connection: ConnectionOptions,
    private readonly queueOptions: Omit<QueueOptions, "connection"> = {},
  ) {}

  async enqueue(
    name: string,
    data: Record<string, unknown>,
    options: JobsOptions = {},
  ): Promise<EnqueueJobResult> {
    const definition = this.registry.require(name);
    const validated = definition.validate?.(data) ?? data;
    const job = await this.queue(definition.queue).add(name, validated, {
      attempts: 3,
      backoff: { delay: 1_000, type: "exponential" },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
      ...definition.options,
      ...options,
    });
    if (!job.id) throw new Error(`BullMQ did not return an id for job "${name}".`);
    return { id: job.id, name, queue: definition.queue };
  }

  async close(): Promise<void> {
    await Promise.all([...this.#queues.values()].map((queue) => queue.close()));
    this.#queues.clear();
  }

  private queue(name: JobQueueName): Queue {
    let queue = this.#queues.get(name);
    if (!queue) {
      queue = new Queue(name, { ...this.queueOptions, connection: this.connection });
      this.#queues.set(name, queue);
    }
    return queue;
  }
}

export class BullMqWorkerFactory {
  constructor(
    private readonly registry: JobRegistry,
    private readonly connection: ConnectionOptions,
  ) {}

  create<Data extends Record<string, unknown>, Result>(
    jobName: string,
    processor: Processor<Data, Result, string>,
    options: Omit<WorkerOptions, "connection"> = {},
  ): Worker<Data, Result, string> {
    const definition = this.registry.require(jobName);
    return new Worker<Data, Result, string>(
      definition.queue,
      async (job, token) => {
        if (job.name !== jobName) throw new UnregisteredJobError(job.name);
        definition.validate?.(job.data);
        return processor(job, token);
      },
      { ...options, connection: this.connection },
    );
  }
}

export class DuplicateJobDefinitionError extends Error {
  constructor(name: string) {
    super(`Job "${name}" is already registered.`);
    this.name = "DuplicateJobDefinitionError";
  }
}

export class UnregisteredJobError extends Error {
  constructor(name: string) {
    super(`Job "${name}" is not registered.`);
    this.name = "UnregisteredJobError";
  }
}

function required(value: string): string {
  const result = value.trim();
  if (!result) throw new Error("Job name is required.");
  return result;
}
