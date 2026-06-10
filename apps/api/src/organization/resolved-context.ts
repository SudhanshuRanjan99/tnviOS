import type { ResolvedOrganizationContext } from "@tnvios/organization";

const RESOLVED_ORGANIZATION_CONTEXT = Symbol("resolvedOrganizationContext");

export function setResolvedOrganizationContext(
  request: object,
  context: ResolvedOrganizationContext,
): void {
  (request as Record<symbol, unknown>)[RESOLVED_ORGANIZATION_CONTEXT] = context;
}

export function getResolvedOrganizationContext(
  request: object,
): ResolvedOrganizationContext | undefined {
  return (request as Record<symbol, ResolvedOrganizationContext | undefined>)[
    RESOLVED_ORGANIZATION_CONTEXT
  ];
}
