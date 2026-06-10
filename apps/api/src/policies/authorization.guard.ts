import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRED_PERMISSION } from "./permission.decorator.js";
import { PolicyPersistence } from "./policy.persistence.js";
import { getResolvedOrganizationContext } from "../organization/resolved-context.js";

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policies: PolicyPersistence,
  ) {}
  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    const permissionCode = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION, [
      executionContext.getHandler(),
      executionContext.getClass(),
    ]);
    if (!permissionCode) return true;
    const context = getResolvedOrganizationContext(
      executionContext.switchToHttp().getRequest<object>(),
    );
    if (!context) throw denied("ORGANIZATION_CONTEXT_REQUIRED");
    const result = await this.policies.evaluate({ permissionCode, context });
    if (!result.allowed) throw denied(result.reason);
    return true;
  }
}
function denied(reason: string) {
  return new ForbiddenException({ code: "ACCESS_DENIED", message: "Access denied.", reason });
}
