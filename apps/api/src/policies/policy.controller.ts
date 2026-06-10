import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { parseEntityId } from "@tnvios/database/identifiers";
import {
  AuthorizationLog,
  FieldPermission,
  Permission,
  ResourcePermission,
  Role,
  RolePermission,
  UserRole,
} from "@tnvios/policies";
import { getResolvedOrganizationContext } from "../organization/resolved-context.js";
import { RequireOrganizationContext } from "../organization/context.decorator.js";
import {
  AssignRolePermissionDto,
  AssignUserRoleDto,
  CreateFieldPermissionDto,
  CreatePermissionDto,
  CreateResourcePermissionDto,
  CreateRoleDto,
  EvaluatePermissionDto,
} from "./policy.dto.js";
import { PolicyPersistence } from "./policy.persistence.js";
import { RequirePermission, SkipAuthorization } from "./permission.decorator.js";

@Controller("policies")
@RequireOrganizationContext()
@RequirePermission("system.authorization.manage")
export class PolicyController {
  constructor(private readonly persistence: PolicyPersistence) {}
  @Get("permissions") listPermissions() {
    return this.collection(this.persistence.list(Permission));
  }
  @Post("permissions") createPermission(@Body() body: CreatePermissionDto) {
    return this.created(new Permission(body));
  }
  @Get("roles") listRoles(@Req() request: object) {
    return this.scoped(request, Role);
  }
  @Post("roles") createRole(@Req() request: object, @Body() body: CreateRoleDto) {
    return this.created(new Role({ ...body, ...this.ids(request) }));
  }
  @Post("role-permissions") assignRolePermission(@Body() body: AssignRolePermissionDto) {
    return this.created(
      new RolePermission({
        roleId: parseEntityId<"role">(body.roleId),
        permissionId: parseEntityId<"permission">(body.permissionId),
      }),
    );
  }
  @Post("user-roles") assignUserRole(@Req() request: object, @Body() body: AssignUserRoleDto) {
    return this.created(
      new UserRole({
        ...this.ids(request),
        userId: parseEntityId<"user">(body.userId),
        roleId: parseEntityId<"role">(body.roleId),
        scopeLevel: body.scopeLevel,
        scopeId: body.scopeId ? parseEntityId(body.scopeId) : null,
      }),
    );
  }
  @Post("field-permissions") createFieldPermission(@Body() body: CreateFieldPermissionDto) {
    return this.created(
      new FieldPermission({ ...body, roleId: parseEntityId<"role">(body.roleId) }),
    );
  }
  @Post("resource-permissions") createResourcePermission(
    @Req() request: object,
    @Body() body: CreateResourcePermissionDto,
  ) {
    return this.created(
      new ResourcePermission({
        ...this.ids(request),
        ...body,
        userId: parseEntityId<"user">(body.userId),
        resourceId: parseEntityId(body.resourceId),
      }),
    );
  }
  @Get("authorization-logs") listAuthorizationLogs(@Req() request: object) {
    return this.scoped(request, AuthorizationLog);
  }
  @Post("evaluate") @SkipAuthorization() async evaluate(
    @Req() request: object,
    @Body() body: EvaluatePermissionDto,
  ) {
    const context = this.context(request);
    const resource =
      body.resourceId && body.resourceType
        ? {
            id: parseEntityId(body.resourceId),
            type: body.resourceType,
            ownerUserId: body.ownerUserId ? parseEntityId<"user">(body.ownerUserId) : null,
          }
        : undefined;
    return {
      success: true as const,
      data: await this.persistence.evaluate({
        permissionCode: body.permissionCode,
        context,
        ...(resource ? { resource } : {}),
      }),
      meta: {},
    };
  }
  private context(request: object) {
    const context = getResolvedOrganizationContext(request);
    if (!context) throw new Error("Resolved organization context required.");
    return context;
  }
  private ids(request: object) {
    const context = this.context(request);
    return { tenantId: context.tenantId, organizationId: context.organizationId };
  }
  private scoped<Entity extends object>(request: object, type: { new (...args: never[]): Entity }) {
    return this.collection(this.persistence.list(type, this.ids(request)));
  }
  private async created<Entity extends object>(entity: Entity) {
    await this.persistence.save(entity);
    return { success: true as const, data: entity, meta: {} };
  }
  private async collection<Entity>(entities: Promise<Entity[]>) {
    const data = await entities;
    return {
      success: true as const,
      data,
      meta: { page: 1, pageSize: data.length, total: data.length },
    };
  }
}
