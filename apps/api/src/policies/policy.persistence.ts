import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { validateEnvironment } from "@tnvios/config";
import { closeMikroOrm, initializeMikroOrm, type TnviosMikroOrm } from "@tnvios/database";
import type { OrganizationId, RoleId, TenantId, UserId } from "@tnvios/database/contracts";
import type { EntityId } from "@tnvios/database/identifiers";
import { UserSchema } from "@tnvios/identity/users";
import { ORGANIZATION_SCHEMAS } from "@tnvios/organization";
import {
  AuthorizationLog,
  FieldPermission,
  PermissionEvaluator,
  POLICY_SCHEMAS,
  ResourcePermission,
  type AuthorizationRequest,
  type AuthorizationResult,
  type RoleGrant,
} from "@tnvios/policies";

@Injectable()
export class PolicyPersistence implements OnApplicationShutdown {
  #orm?: Promise<TnviosMikroOrm>;

  async save(entity: object): Promise<void> {
    const em = (await this.#getOrm()).em.fork();
    await em.transactional(async (transactionalEm) => {
      transactionalEm.persist(entity);
      await transactionalEm.flush();
    });
  }

  async list<Entity extends object>(
    type: { new (...args: never[]): Entity },
    where: object = {},
  ): Promise<Entity[]> {
    return (await this.#getOrm()).em.fork().find(type, where as never);
  }

  async evaluate(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const grants = await this.findRoleGrants(
      request.context.userId,
      request.context.tenantId,
      request.context.organizationId,
    );
    const effect = request.resource
      ? await this.findRecordEffect(
          request.context.userId,
          request.context.tenantId,
          request.context.organizationId,
          request.permissionCode,
          request.resource.type,
          request.resource.id,
        )
      : undefined;
    const result = new PermissionEvaluator().evaluate(request, grants, effect);
    await this.save(
      new AuthorizationLog({
        tenantId: request.context.tenantId,
        organizationId: request.context.organizationId,
        userId: request.context.userId,
        permissionCode: request.permissionCode,
        resourceType: request.resource?.type,
        resourceId: request.resource?.id,
        decision: result.allowed ? "allow" : "deny",
        reason: result.reason,
        context: {
          businessUnitId: request.context.businessUnitId,
          departmentId: request.context.departmentId,
          teamId: request.context.teamId,
        },
      }),
    );
    return result;
  }

  async allowedFields(
    roleIds: readonly RoleId[],
    permissionCode: string,
    resourceType: string,
  ): Promise<string[]> {
    if (roleIds.length === 0) return [];
    const entries = await (await this.#getOrm()).em
      .fork()
      .find(FieldPermission, { roleId: { $in: roleIds }, permissionCode, resourceType });
    const denied = new Set(
      entries.filter((entry) => entry.effect === "deny").map((entry) => entry.fieldName),
    );
    return [
      ...new Set(
        entries.filter((entry) => entry.effect === "allow").map((entry) => entry.fieldName),
      ),
    ].filter((field) => !denied.has(field));
  }

  private async findRoleGrants(
    userId: UserId,
    tenantId: TenantId,
    organizationId: OrganizationId,
  ): Promise<RoleGrant[]> {
    const rows = await (await this.#getOrm()).em.getConnection().execute<
      Array<{
        permission_code: string;
        scope_level: RoleGrant["scopeLevel"];
        scope_id: EntityId | null;
      }>
    >("select p.code as permission_code, ur.scope_level, ur.scope_id from user_roles ur join roles r on r.id = ur.role_id join role_permissions rp on rp.role_id = r.id join permissions p on p.id = rp.permission_id where ur.user_id = ? and ur.tenant_id = ? and ur.organization_id = ? and ur.deleted_at is null and r.deleted_at is null and r.status = 'active'", [userId, tenantId, organizationId]);
    return rows.map((row) => ({
      permissionCode: row.permission_code,
      scopeLevel: row.scope_level,
      scopeId: row.scope_id,
    }));
  }

  private async findRecordEffect(
    userId: UserId,
    tenantId: TenantId,
    organizationId: OrganizationId,
    permissionCode: string,
    resourceType: string,
    resourceId: EntityId,
  ) {
    const record = await (await this.#getOrm()).em.fork().findOne(ResourcePermission, {
      userId,
      tenantId,
      organizationId,
      permissionCode,
      resourceType,
      resourceId,
    });
    return record?.effect;
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.#orm) await closeMikroOrm(await this.#orm);
  }
  #getOrm(): Promise<TnviosMikroOrm> {
    this.#orm ??= initializeMikroOrm({
      debug: false,
      entities: [UserSchema, ...ORGANIZATION_SCHEMAS, ...POLICY_SCHEMAS],
      environment: validateEnvironment(process.env),
    });
    return this.#orm;
  }
}
