export const DEFAULT_DATABASE_SCHEMA = "public";
export const POSTGRES_IDENTIFIER_MAX_LENGTH = 63;

export const COMMON_BUSINESS_ENTITY_COLUMNS = [
  "id",
  "tenant_id",
  "organization_id",
  "created_at",
  "updated_at",
  "deleted_at",
  "created_by",
  "updated_by",
  "deleted_by",
] as const;

export const HIERARCHY_SCOPE_COLUMNS = ["business_unit_id", "department_id", "team_id"] as const;

export type CommonBusinessEntityColumn = (typeof COMMON_BUSINESS_ENTITY_COLUMNS)[number];
export type HierarchyScopeColumn = (typeof HIERARCHY_SCOPE_COLUMNS)[number];
