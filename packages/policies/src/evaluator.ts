import type { EntityId } from "@tnvios/database/identifiers";
import type { ResolvedOrganizationContext } from "@tnvios/organization";

import type { ScopeLevel } from "./entities.js";

export interface RoleGrant {
  readonly permissionCode: string;
  readonly scopeLevel: ScopeLevel;
  readonly scopeId: EntityId | null;
}
export interface AuthorizationRequest {
  readonly permissionCode: string;
  readonly context: ResolvedOrganizationContext;
  readonly resource?: {
    readonly id: EntityId;
    readonly type: string;
    readonly ownerUserId?: EntityId<"user"> | null;
  };
}
export interface AuthorizationResult {
  readonly allowed: boolean;
  readonly reason: string;
  readonly matchingGrant?: RoleGrant;
}

export class ScopeEvaluator {
  matches(grant: RoleGrant, request: AuthorizationRequest): boolean {
    const { context, resource } = request;
    switch (grant.scopeLevel) {
      case "tenant":
        return true;
      case "organization":
        return true;
      case "business_unit":
        return grant.scopeId !== null && grant.scopeId === context.businessUnitId;
      case "department":
        return grant.scopeId !== null && grant.scopeId === context.departmentId;
      case "team":
        return grant.scopeId !== null && grant.scopeId === context.teamId;
      case "personal":
        return resource?.ownerUserId === context.userId;
      case "record":
        return grant.scopeId !== null && grant.scopeId === resource?.id;
      case "field":
        return false;
    }
  }
}

export class PermissionEvaluator {
  constructor(private readonly scopes = new ScopeEvaluator()) {}
  evaluate(
    request: AuthorizationRequest,
    grants: readonly RoleGrant[],
    explicitRecordEffect?: "allow" | "deny",
  ): AuthorizationResult {
    if (explicitRecordEffect === "deny") return { allowed: false, reason: "EXPLICIT_RECORD_DENY" };
    const matchingGrant = grants.find(
      (grant) =>
        grant.permissionCode === request.permissionCode && this.scopes.matches(grant, request),
    );
    if (matchingGrant)
      return { allowed: true, reason: "ROLE_PERMISSION_SCOPE_MATCH", matchingGrant };
    if (explicitRecordEffect === "allow") return { allowed: true, reason: "EXPLICIT_RECORD_ALLOW" };
    return { allowed: false, reason: "NO_MATCHING_ROLE_PERMISSION" };
  }
}
