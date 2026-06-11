import type { CollectionFieldSchema } from "typesense/lib/Typesense/Collection.js";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections.js";

import type { SearchDocument } from "./contracts.js";

export interface SearchProjectionInput {
  readonly tenantId: string;
  readonly organizationId: string;
  readonly entityId: string;
}

export interface SearchIndexDefinition<Document extends SearchDocument = SearchDocument> {
  readonly name: string;
  readonly collectionName: string;
  readonly entityType: string;
  readonly permissionCode: string;
  readonly queryBy: readonly (keyof Document & string)[];
  readonly resultFields: readonly (keyof Document & string)[];
  readonly fields?: readonly CollectionFieldSchema[];
  project(input: SearchProjectionInput): Promise<Document | null>;
}

export class SearchIndexRegistry {
  readonly #definitions = new Map<string, SearchIndexDefinition>();

  register<Document extends SearchDocument>(definition: SearchIndexDefinition<Document>): void {
    const name = required(definition.name, "Search index name");
    if (this.#definitions.has(name)) throw new DuplicateSearchIndexError(name);
    if (this.list().some((registered) => registered.collectionName === definition.collectionName)) {
      throw new DuplicateSearchCollectionError(definition.collectionName);
    }
    if (!definition.queryBy.length) throw new Error("Search index queryBy must not be empty.");
    if (!definition.resultFields.length)
      throw new Error("Search index resultFields must not be empty.");
    this.#definitions.set(name, { ...definition, name });
  }

  get(name: string): SearchIndexDefinition | undefined {
    return this.#definitions.get(name);
  }

  require(name: string): SearchIndexDefinition {
    const definition = this.get(name);
    if (!definition) throw new UnregisteredSearchIndexError(name);
    return definition;
  }

  list(): readonly SearchIndexDefinition[] {
    return [...this.#definitions.values()];
  }
}

export function createSearchCollectionSchema(
  definition: SearchIndexDefinition,
): CollectionCreateSchema {
  return {
    name: definition.collectionName,
    fields: [...BASE_SEARCH_FIELDS, ...(definition.fields ?? [])],
    default_sorting_field: "createdAt",
    enable_nested_fields: false,
  };
}

const BASE_SEARCH_FIELDS: readonly CollectionFieldSchema[] = [
  { name: "id", type: "string" },
  { name: "tenantId", type: "string", facet: true },
  { name: "organizationId", type: "string", facet: true },
  { name: "entityType", type: "string", facet: true },
  { name: "entityId", type: "string", facet: true },
  { name: "permissionCode", type: "string", facet: true },
  { name: "title", type: "string" },
  { name: "module", type: "string", facet: true },
  { name: "searchText", type: "string" },
  { name: "visibility", type: "string", facet: true },
  { name: "accessPrincipals", type: "string[]", facet: true },
  { name: "createdAt", type: "int64", sort: true },
];

export class DuplicateSearchIndexError extends Error {
  constructor(name: string) {
    super(`Search index "${name}" is already registered.`);
    this.name = "DuplicateSearchIndexError";
  }
}
export class DuplicateSearchCollectionError extends Error {
  constructor(name: string) {
    super(`Search collection "${name}" is already registered.`);
    this.name = "DuplicateSearchCollectionError";
  }
}
export class UnregisteredSearchIndexError extends Error {
  constructor(name: string) {
    super(`Search index "${name}" is not registered.`);
    this.name = "UnregisteredSearchIndexError";
  }
}
function required(value: string, label: string): string {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required.`);
  return result;
}
