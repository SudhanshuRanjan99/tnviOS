import type Typesense from "typesense";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections.js";

import type { SearchDocument } from "./contracts.js";

export interface SearchGatewayResult<Document extends SearchDocument = SearchDocument> {
  readonly found: number;
  readonly page: number;
  readonly documents: readonly Document[];
}

export interface SearchGateway {
  ensureCollection(schema: CollectionCreateSchema): Promise<void>;
  upsert(collectionName: string, document: SearchDocument): Promise<void>;
  delete(collectionName: string, documentId: string): Promise<void>;
  search(input: {
    collectionName: string;
    query: string;
    queryBy: readonly string[];
    filterBy: string;
    page?: number;
    perPage?: number;
  }): Promise<SearchGatewayResult>;
}

export class TypesenseSearchGateway implements SearchGateway {
  constructor(private readonly client: Typesense.Client) {}

  async ensureCollection(schema: CollectionCreateSchema): Promise<void> {
    if (!(await this.client.collections(schema.name).exists())) {
      await this.client.collections().create(schema);
    }
  }

  async upsert(collectionName: string, document: SearchDocument): Promise<void> {
    await this.client.collections<SearchDocument>(collectionName).documents().upsert(document);
  }

  async delete(collectionName: string, documentId: string): Promise<void> {
    await this.client
      .collections(collectionName)
      .documents(documentId)
      .delete({ ignore_not_found: true });
  }

  async search(input: {
    collectionName: string;
    query: string;
    queryBy: readonly string[];
    filterBy: string;
    page?: number;
    perPage?: number;
  }): Promise<SearchGatewayResult> {
    const response = await this.client
      .collections<SearchDocument>(input.collectionName)
      .documents()
      .search({
        q: input.query,
        query_by: input.queryBy.join(","),
        filter_by: input.filterBy,
        page: input.page ?? 1,
        per_page: input.perPage ?? 20,
      });
    return {
      found: response.found,
      page: response.page,
      documents: (response.hits ?? []).map((hit) => hit.document),
    };
  }
}
