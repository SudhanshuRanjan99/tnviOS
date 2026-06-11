import type { BullMqWorkerFactory, JobRegistry } from "@tnvios/jobs";

import type { SearchGateway } from "./gateway.js";
import { createSearchCollectionSchema, type SearchIndexRegistry } from "./registry.js";

export const SEARCH_INDEX_UPSERT_JOB = "search.index.upsert";
export const SEARCH_INDEX_DELETE_JOB = "search.index.delete";

export interface SearchIndexJobData extends Record<string, unknown> {
  readonly indexName: string;
  readonly tenantId: string;
  readonly organizationId: string;
  readonly entityId: string;
}

export function registerSearchIndexJobs(registry: JobRegistry): void {
  registry.register({
    name: SEARCH_INDEX_UPSERT_JOB,
    queue: "search-indexing",
    validate: validateSearchIndexJob,
  });
  registry.register({
    name: SEARCH_INDEX_DELETE_JOB,
    queue: "search-indexing",
    validate: validateSearchIndexJob,
  });
}

export class SearchIndexingProcessor {
  constructor(
    private readonly indexes: SearchIndexRegistry,
    private readonly gateway: SearchGateway,
  ) {}

  async upsert(input: SearchIndexJobData): Promise<"upserted" | "deleted"> {
    const definition = this.indexes.require(input.indexName);
    await this.gateway.ensureCollection(createSearchCollectionSchema(definition));
    const document = await definition.project(input);
    if (!document) {
      await this.gateway.delete(definition.collectionName, input.entityId);
      return "deleted";
    }
    assertProjectionContext(document, input, definition.entityType, definition.permissionCode);
    await this.gateway.upsert(definition.collectionName, document);
    return "upserted";
  }

  async delete(input: SearchIndexJobData): Promise<void> {
    const definition = this.indexes.require(input.indexName);
    await this.gateway.delete(definition.collectionName, input.entityId);
  }
}

export interface SearchIndexingWorker {
  close(): Promise<void>;
}

export function createSearchIndexingWorkers(
  factory: BullMqWorkerFactory,
  processor: SearchIndexingProcessor,
): readonly SearchIndexingWorker[] {
  return [
    factory.create<SearchIndexJobData, "upserted" | "deleted">(SEARCH_INDEX_UPSERT_JOB, (job) =>
      processor.upsert(job.data),
    ),
    factory.create<SearchIndexJobData, undefined>(SEARCH_INDEX_DELETE_JOB, async (job) => {
      await processor.delete(job.data);
      return undefined;
    }),
  ] as const;
}

function validateSearchIndexJob(data: Record<string, unknown>): SearchIndexJobData {
  return {
    indexName: stringValue(data.indexName, "indexName"),
    tenantId: stringValue(data.tenantId, "tenantId"),
    organizationId: stringValue(data.organizationId, "organizationId"),
    entityId: stringValue(data.entityId, "entityId"),
  };
}

function assertProjectionContext(
  document: Record<string, unknown>,
  input: SearchIndexJobData,
  entityType: string,
  permissionCode: string,
): void {
  if (
    document.id !== input.entityId ||
    document.entityId !== input.entityId ||
    document.tenantId !== input.tenantId ||
    document.organizationId !== input.organizationId ||
    document.entityType !== entityType ||
    document.permissionCode !== permissionCode
  ) {
    throw new Error("Search projection does not match its registered index context.");
  }
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}
