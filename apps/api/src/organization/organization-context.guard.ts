import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { requestContextStore } from "@tnvios/request-context";
import { getAuthenticatedIdentity } from "../auth/authenticated-request.js";
import { ORGANIZATION_CONTEXT_LEVEL, type OrganizationContextLevel } from "./context.decorator.js";
import { OrganizationPersistence } from "./organization.persistence.js";
import { setResolvedOrganizationContext } from "./resolved-context.js";

@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly persistence: OrganizationPersistence,
  ) {}

  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    const level =
      this.reflector.getAllAndOverride<OrganizationContextLevel>(ORGANIZATION_CONTEXT_LEVEL, [
        executionContext.getHandler(),
        executionContext.getClass(),
      ]) ?? "organization";
    if (level === "none") return true;
    const request = executionContext.switchToHttp().getRequest<object>();
    const identity = getAuthenticatedIdentity(request);
    if (!identity) return true;
    const context = requestContextStore.require();
    if (context.tenantId === null) throw forbidden("TENANT_CONTEXT_REQUIRED");
    if (!(await this.persistence.tenantExists(context.tenantId)))
      throw forbidden("TENANT_NOT_FOUND");
    if (level === "tenant") {
      if (!(await this.persistence.userHasTenantAccess(identity.userId, context.tenantId))) {
        throw forbidden("MEMBERSHIP_REQUIRED");
      }
      return true;
    }
    try {
      setResolvedOrganizationContext(
        request,
        await this.persistence.resolve(identity.userId, context),
      );
      return true;
    } catch (error) {
      const code = error instanceof Error ? error.message : "INVALID_ORGANIZATION_CONTEXT";
      throw forbidden(code);
    }
  }
}

function forbidden(code: string): ForbiddenException {
  return new ForbiddenException({
    code,
    message: "The requested organization context is not accessible.",
  });
}
