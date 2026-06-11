import { createRawSqlQuery, type RawSqlHelper } from "@tnvios/database/raw-sql";

import {
  searchPrincipals,
  type SearchPrincipalContext,
  type SearchVisibility,
} from "./contracts.js";

export interface VectorEmbedding {
  readonly id: string;
  readonly tenantId: string;
  readonly organizationId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly permissionCode: string;
  readonly visibility: SearchVisibility;
  readonly accessPrincipals: readonly string[];
  readonly content: string;
  readonly contentHash: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly embedding: readonly number[];
}

export interface VectorSearchResult {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly content: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly distance: number;
}

export class PgVectorRepository {
  constructor(private readonly sql: RawSqlHelper) {}

  async upsert(record: VectorEmbedding): Promise<void> {
    const embedding = vectorLiteral(record.embedding);
    await this.sql.mutate(
      createRawSqlQuery(
        `insert into search_embeddings
          (id, tenant_id, organization_id, entity_type, entity_id, permission_code, visibility,
           access_principals, content, content_hash, metadata, embedding, embedding_dimensions)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::vector, ?)
         on conflict (tenant_id, organization_id, entity_type, entity_id)
         do update set permission_code = excluded.permission_code, visibility = excluded.visibility,
           access_principals = excluded.access_principals, content = excluded.content,
           content_hash = excluded.content_hash, metadata = excluded.metadata,
           embedding = excluded.embedding, embedding_dimensions = excluded.embedding_dimensions,
           updated_at = now()`,
        [
          record.id,
          record.tenantId,
          record.organizationId,
          record.entityType,
          record.entityId,
          record.permissionCode,
          record.visibility,
          [...record.accessPrincipals],
          record.content,
          record.contentHash,
          JSON.stringify(record.metadata),
          embedding,
          record.embedding.length,
        ],
      ),
    );
  }

  async search(input: {
    readonly context: SearchPrincipalContext;
    readonly embedding: readonly number[];
    readonly entityTypes?: readonly string[];
    readonly limit?: number;
  }): Promise<readonly VectorSearchResult[]> {
    const vector = vectorLiteral(input.embedding);
    const principals = searchPrincipals(input.context);
    const allowedPermissions = input.context.permissionCodes;
    if (!allowedPermissions.length) return [];
    return this.sql.all<VectorSearchResult>(
      createRawSqlQuery(
        `select id, entity_type as "entityType", entity_id as "entityId", content, metadata,
                embedding <=> ?::vector as distance
         from search_embeddings
         where tenant_id = ? and organization_id = ?
           and embedding_dimensions = ?
           and permission_code = any(?)
           and (?::text[] is null or entity_type = any(?))
           and (visibility = 'organization' or access_principals && ?)
         order by embedding <=> ?::vector
         limit ?`,
        [
          vector,
          input.context.tenantId,
          input.context.organizationId,
          input.embedding.length,
          [...allowedPermissions],
          input.entityTypes ? [...input.entityTypes] : null,
          input.entityTypes ? [...input.entityTypes] : null,
          [...principals],
          vector,
          boundedLimit(input.limit),
        ],
      ),
    );
  }
}

export function vectorLiteral(values: readonly number[]): string {
  if (!values.length || values.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding must contain finite numeric values.");
  }
  return `[${values.join(",")}]`;
}

function boundedLimit(value = 10): number {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("Vector search limit must be between 1 and 100.");
  }
  return value;
}
