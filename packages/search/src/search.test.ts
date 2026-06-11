import { createEntityId } from "@tnvios/database/identifiers";
import {
  RawSqlHelper,
  type RawSqlDriver,
  type RawSqlMutationResult,
  type RawSqlQuery,
} from "@tnvios/database/raw-sql";
import { describe, expect, it, vi } from "vitest";

import type { SearchDocument } from "./contracts.js";
import type { SearchGateway } from "./gateway.js";
import { SearchIndexingProcessor } from "./indexing.js";
import { PermissionFilteredSearch, SearchPermissionDeniedError } from "./query.js";
import {
  DuplicateSearchIndexError,
  SearchIndexRegistry,
  type SearchIndexDefinition,
} from "./registry.js";
import { PgVectorRepository, vectorLiteral } from "./vector.js";

const tenantId = createEntityId<"tenant">();
const organizationId = createEntityId<"organization">();
const userId = createEntityId<"user">();
const entityId = createEntityId<"entity">();

function document(overrides: Partial<SearchDocument> = {}): SearchDocument {
  return {
    id: entityId,
    tenantId,
    organizationId,
    entityType: "files",
    entityId,
    permissionCode: "files.file.read",
    title: "Annual report",
    module: "files",
    searchText: "Annual report",
    visibility: "restricted",
    accessPrincipals: [`user:${userId}`],
    createdAt: Date.now(),
    secret: "not-for-search-results",
    ...overrides,
  };
}

function definition(project = vi.fn(async () => document())): SearchIndexDefinition {
  return {
    name: "files",
    collectionName: "files",
    entityType: "files",
    permissionCode: "files.file.read",
    queryBy: ["title", "searchText"],
    resultFields: ["id", "title", "entityType", "entityId"],
    project,
  };
}

function gateway(): SearchGateway {
  return {
    ensureCollection: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(async () => ({ found: 1, page: 1, documents: [document()] })),
  };
}

describe("SearchIndexRegistry", () => {
  it("registers definitions and rejects duplicate names", () => {
    const registry = new SearchIndexRegistry();
    registry.register(definition());
    expect(registry.require("files").collectionName).toBe("files");
    expect(() => registry.register({ ...definition(), collectionName: "files-v2" })).toThrow(
      DuplicateSearchIndexError,
    );
  });
});

describe("SearchIndexingProcessor", () => {
  it("ensures the collection and upserts a safe projection", async () => {
    const registry = new SearchIndexRegistry();
    registry.register(definition());
    const search = gateway();
    const result = await new SearchIndexingProcessor(registry, search).upsert({
      indexName: "files",
      tenantId,
      organizationId,
      entityId,
    });
    expect(result).toBe("upserted");
    expect(search.ensureCollection).toHaveBeenCalledOnce();
    expect(search.upsert).toHaveBeenCalledWith("files", expect.objectContaining({ entityId }));
  });

  it("rejects a projection that escapes the requested tenant context", async () => {
    const registry = new SearchIndexRegistry();
    registry.register(
      definition(vi.fn(async () => document({ tenantId: createEntityId<"tenant">() }))),
    );
    await expect(
      new SearchIndexingProcessor(registry, gateway()).upsert({
        indexName: "files",
        tenantId,
        organizationId,
        entityId,
      }),
    ).rejects.toThrow("does not match");
  });
});

describe("PermissionFilteredSearch", () => {
  it("builds mandatory access filters and allowlists returned fields", async () => {
    const registry = new SearchIndexRegistry();
    registry.register(definition());
    const search = gateway();
    const result = await new PermissionFilteredSearch(registry, search).search({
      indexName: "files",
      query: "annual",
      context: {
        tenantId,
        organizationId,
        userId,
        roleIds: ["finance"],
        permissionCodes: ["files.file.read"],
        allowedResultFields: ["id", "title"],
      },
    });
    expect(search.search).toHaveBeenCalledWith(
      expect.objectContaining({
        filterBy: expect.stringContaining(`tenantId:=\`${tenantId}\``),
      }),
    );
    expect(result.documents).toEqual([{ id: entityId, title: "Annual report" }]);
  });

  it("denies searches without the registered permission", async () => {
    const registry = new SearchIndexRegistry();
    registry.register(definition());
    await expect(
      new PermissionFilteredSearch(registry, gateway()).search({
        indexName: "files",
        query: "*",
        context: { tenantId, organizationId, userId, permissionCodes: [] },
      }),
    ).rejects.toBeInstanceOf(SearchPermissionDeniedError);
  });
});

describe("PgVectorRepository", () => {
  it("uses bound context and vector parameters for retrieval", async () => {
    const driver = new CapturingRawSqlDriver();
    await new PgVectorRepository(new RawSqlHelper(driver)).search({
      context: {
        tenantId,
        organizationId,
        userId,
        permissionCodes: ["files.file.read"],
      },
      embedding: [0.25, 0.75],
    });
    expect(driver.lastQuery?.text).toContain("embedding <=> ?::vector");
    expect(driver.lastQuery?.parameters).toContain("[0.25,0.75]");
    expect(driver.lastQuery?.parameters).toContain(tenantId);
  });

  it("rejects invalid embeddings", () => {
    expect(() => vectorLiteral([])).toThrow("Embedding");
    expect(() => vectorLiteral([Number.NaN])).toThrow("Embedding");
  });
});

class CapturingRawSqlDriver implements RawSqlDriver {
  lastQuery: RawSqlQuery | undefined;
  all<Row extends object>(query: RawSqlQuery): Promise<readonly Row[]> {
    this.lastQuery = query;
    return Promise.resolve([]);
  }
  isInTransaction(): boolean {
    return true;
  }
  mutate(query: RawSqlQuery): Promise<RawSqlMutationResult> {
    this.lastQuery = query;
    return Promise.resolve({ affectedRows: 1 });
  }
  one<Row extends object>(query: RawSqlQuery): Promise<Row | null> {
    this.lastQuery = query;
    return Promise.resolve(null);
  }
}
