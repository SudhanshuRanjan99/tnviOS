import { searchPrincipals, type SearchDocument, type SearchPrincipalContext } from "./contracts.js";
import type { SearchGateway } from "./gateway.js";
import type { SearchIndexRegistry } from "./registry.js";

export interface PermissionFilteredSearchInput {
  readonly indexName: string;
  readonly query: string;
  readonly context: SearchPrincipalContext;
  readonly page?: number;
  readonly perPage?: number;
}

export interface PermissionFilteredSearchResult {
  readonly found: number;
  readonly page: number;
  readonly documents: readonly Partial<SearchDocument>[];
}

export class PermissionFilteredSearch {
  constructor(
    private readonly indexes: SearchIndexRegistry,
    private readonly gateway: SearchGateway,
  ) {}

  async search(input: PermissionFilteredSearchInput): Promise<PermissionFilteredSearchResult> {
    const definition = this.indexes.require(input.indexName);
    if (!input.context.permissionCodes.includes(definition.permissionCode)) {
      throw new SearchPermissionDeniedError(definition.permissionCode);
    }
    const response = await this.gateway.search({
      collectionName: definition.collectionName,
      query: input.query.trim() || "*",
      queryBy: definition.queryBy,
      filterBy: createPermissionFilter(
        input.context,
        definition.entityType,
        definition.permissionCode,
      ),
      page: input.page,
      perPage: boundedPerPage(input.perPage),
    });
    const allowed = new Set(
      input.context.allowedResultFields
        ? definition.resultFields.filter((field) =>
            input.context.allowedResultFields?.includes(field),
          )
        : definition.resultFields,
    );
    return {
      found: response.found,
      page: response.page,
      documents: response.documents.map((document) =>
        Object.fromEntries(Object.entries(document).filter(([field]) => allowed.has(field))),
      ),
    };
  }
}

export function createPermissionFilter(
  context: SearchPrincipalContext,
  entityType: string,
  permissionCode: string,
): string {
  const principals = searchPrincipals(context);
  const access = principals.length
    ? ` || accessPrincipals:=[${principals.map(typesenseLiteral).join(",")}]`
    : "";
  return [
    `tenantId:=${typesenseLiteral(context.tenantId)}`,
    `organizationId:=${typesenseLiteral(context.organizationId)}`,
    `entityType:=${typesenseLiteral(entityType)}`,
    `permissionCode:=${typesenseLiteral(permissionCode)}`,
    `(visibility:=${typesenseLiteral("organization")}${access})`,
  ].join(" && ");
}

export class SearchPermissionDeniedError extends Error {
  constructor(permissionCode: string) {
    super(`Search requires permission "${permissionCode}".`);
    this.name = "SearchPermissionDeniedError";
  }
}

function typesenseLiteral(value: string): string {
  return `\`${value.replaceAll("\\", "\\\\").replaceAll("`", "\\`")}\``;
}
function boundedPerPage(value = 20): number {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("Search perPage must be between 1 and 100.");
  }
  return value;
}
