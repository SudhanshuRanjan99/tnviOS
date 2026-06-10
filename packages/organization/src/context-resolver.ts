import type {
  BusinessUnitId,
  DepartmentId,
  OrganizationId,
  TeamId,
  TenantId,
  UserId,
} from "@tnvios/database/contracts";

import type { Membership } from "./entities.js";

export interface OrganizationContextInput {
  readonly tenantId: TenantId | null;
  readonly organizationId: OrganizationId | null;
  readonly businessUnitId: BusinessUnitId | null;
  readonly departmentId: DepartmentId | null;
  readonly teamId: TeamId | null;
}

export interface ResolvedOrganizationContext {
  readonly tenantId: TenantId;
  readonly organizationId: OrganizationId;
  readonly businessUnitId: BusinessUnitId | null;
  readonly departmentId: DepartmentId | null;
  readonly teamId: TeamId | null;
  readonly membershipId: Membership["id"];
  readonly userId: UserId;
}

export interface OrganizationContextRepository {
  tenantExists(tenantId: TenantId): Promise<boolean>;
  organizationBelongsToTenant(organizationId: OrganizationId, tenantId: TenantId): Promise<boolean>;
  findActiveMembership(
    userId: UserId,
    tenantId: TenantId,
    organizationId: OrganizationId,
  ): Promise<Membership | null>;
  hierarchyBelongsToOrganization(
    input: Required<Omit<OrganizationContextInput, "businessUnitId" | "departmentId" | "teamId">> &
      Pick<OrganizationContextInput, "businessUnitId" | "departmentId" | "teamId">,
  ): Promise<boolean>;
}

export class OrganizationContextResolutionError extends Error {
  constructor(
    readonly code:
      | "TENANT_CONTEXT_REQUIRED"
      | "ORGANIZATION_CONTEXT_REQUIRED"
      | "TENANT_NOT_FOUND"
      | "ORGANIZATION_NOT_FOUND"
      | "MEMBERSHIP_REQUIRED"
      | "INVALID_HIERARCHY_CONTEXT",
  ) {
    super(code);
    this.name = "OrganizationContextResolutionError";
  }
}

export class OrganizationContextResolver {
  constructor(private readonly repository: OrganizationContextRepository) {}

  async resolve(
    userId: UserId,
    input: OrganizationContextInput,
  ): Promise<ResolvedOrganizationContext> {
    if (input.tenantId === null)
      throw new OrganizationContextResolutionError("TENANT_CONTEXT_REQUIRED");
    if (!(await this.repository.tenantExists(input.tenantId)))
      throw new OrganizationContextResolutionError("TENANT_NOT_FOUND");
    if (input.organizationId === null)
      throw new OrganizationContextResolutionError("ORGANIZATION_CONTEXT_REQUIRED");
    if (!(await this.repository.organizationBelongsToTenant(input.organizationId, input.tenantId)))
      throw new OrganizationContextResolutionError("ORGANIZATION_NOT_FOUND");
    const membership = await this.repository.findActiveMembership(
      userId,
      input.tenantId,
      input.organizationId,
    );
    if (membership === null) throw new OrganizationContextResolutionError("MEMBERSHIP_REQUIRED");
    if (
      !(await this.repository.hierarchyBelongsToOrganization({
        ...input,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
      }))
    ) {
      throw new OrganizationContextResolutionError("INVALID_HIERARCHY_CONTEXT");
    }
    return {
      ...input,
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      membershipId: membership.id,
      userId,
    };
  }
}
