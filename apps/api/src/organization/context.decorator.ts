import { SetMetadata } from "@nestjs/common";

export const ORGANIZATION_CONTEXT_LEVEL = Symbol("organizationContextLevel");
export type OrganizationContextLevel = "none" | "tenant" | "organization";

export const RequireOrganizationContext = () =>
  SetMetadata(ORGANIZATION_CONTEXT_LEVEL, "organization" satisfies OrganizationContextLevel);
export const RequireTenantContext = () =>
  SetMetadata(ORGANIZATION_CONTEXT_LEVEL, "tenant" satisfies OrganizationContextLevel);
export const SkipOrganizationContext = () =>
  SetMetadata(ORGANIZATION_CONTEXT_LEVEL, "none" satisfies OrganizationContextLevel);
