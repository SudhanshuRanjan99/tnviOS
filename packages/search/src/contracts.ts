export const SEARCH_VISIBILITIES = ["organization", "restricted"] as const;
export type SearchVisibility = (typeof SEARCH_VISIBILITIES)[number];

export interface SearchDocument extends Record<string, unknown> {
  readonly id: string;
  readonly tenantId: string;
  readonly organizationId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly permissionCode: string;
  readonly title: string;
  readonly module: string;
  readonly searchText: string;
  readonly visibility: SearchVisibility;
  readonly accessPrincipals: readonly string[];
  readonly createdAt: number;
}

export interface SearchPrincipalContext {
  readonly tenantId: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly roleIds?: readonly string[];
  readonly teamIds?: readonly string[];
  readonly permissionCodes: readonly string[];
  readonly allowedResultFields?: readonly string[];
}

export function searchPrincipals(context: SearchPrincipalContext): readonly string[] {
  return [
    `user:${context.userId}`,
    ...(context.roleIds ?? []).map((id) => `role:${id}`),
    ...(context.teamIds ?? []).map((id) => `team:${id}`),
  ];
}
