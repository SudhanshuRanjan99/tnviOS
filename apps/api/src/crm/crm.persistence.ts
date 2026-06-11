import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { AuditLog } from "@tnvios/audit";
import { validateEnvironment } from "@tnvios/config";
import { CRM_SCHEMAS, CrmActivity, CrmContact, CrmCustomer, CrmLead, CrmOpportunity, crmPermissions } from "@tnvios/crm";
import { closeMikroOrm, initializeMikroOrm, type TnviosMikroOrm } from "@tnvios/database";
import type { OrganizationId, TenantId, UserId } from "@tnvios/database/contracts";
import type { EntityId } from "@tnvios/database/identifiers";
import { OutboxEvent } from "@tnvios/events";
import { UserSchema } from "@tnvios/identity/users";
import { Membership, ORGANIZATION_SCHEMAS, Organization, Tenant } from "@tnvios/organization";
import { Permission, POLICY_SCHEMAS, Role, RolePermission, UserRole } from "@tnvios/policies";
import { requestContextStore } from "@tnvios/request-context";

import { AuditEventsPersistence } from "../events/audit-events.persistence.js";

@Injectable()
export class CrmPersistence implements OnApplicationShutdown {
  #orm?: Promise<TnviosMikroOrm>;
  constructor(private readonly auditEvents: AuditEventsPersistence) {}

  async save(entity: CrmEntity, eventType?: string): Promise<void> {
    const type = crmEntityType(entity);
    const event = eventType ?? `crm.${type}.created`;
    const correlationId = requestContextStore.get()?.correlationId ?? null;
    await this.auditEvents.recordMutation(
      entity,
      new AuditLog({ tenantId: entity.tenantId, organizationId: entity.organizationId, entityType: `crm.${type}`, entityId: entity.id, action: event.endsWith(".created") ? "created" : "updated", newValues: { ...entity }, correlationId }),
      new OutboxEvent({ tenantId: entity.tenantId, organizationId: entity.organizationId, eventType: event, source: "crm", aggregateType: `crm.${type}`, aggregateId: entity.id, payload: { id: entity.id }, correlationId }),
    );
  }

  async list<Entity extends CrmEntity>(type: CrmType<Entity>, tenantId: TenantId, organizationId: OrganizationId): Promise<Entity[]> {
    return (await this.#getOrm()).em.fork().find(type, { tenantId, organizationId, deletedAt: null } as never);
  }

  async find<Entity extends CrmEntity>(type: CrmType<Entity>, id: EntityId, tenantId: TenantId, organizationId: OrganizationId): Promise<Entity | null> {
    return (await this.#getOrm()).em.fork().findOne(type, { id, tenantId, organizationId, deletedAt: null } as never);
  }

  async bootstrapLocalDemo(userId: UserId): Promise<{ tenantId: TenantId; organizationId: OrganizationId }> {
    if (validateEnvironment(process.env).TNVIOS_ENV !== "local")
      throw new Error("CRM local demo bootstrap is disabled.");
    const em = (await this.#getOrm()).em.fork();
    return em.transactional(async (tx) => {
      let membership = await tx.findOne(Membership, { userId, status: "active", deletedAt: null });
      if (!membership) {
        const tenant = new Tenant({ name: "Local Demo Tenant", slug: `local-${userId.slice(0, 8)}` });
        const organization = new Organization({
          tenantId: tenant.id,
          name: "Local Demo Organization",
          country: "NP",
          currency: "NPR",
        });
        membership = new Membership({
          tenantId: tenant.id,
          organizationId: organization.id,
          userId,
          memberType: "employee",
        });
        tx.persist([tenant, organization, membership]);
      }
      let role = await tx.findOne(Role, {
        organizationId: membership.organizationId,
        name: "CRM Administrator",
        deletedAt: null,
      });
      role ??= new Role({
        tenantId: membership.tenantId,
        organizationId: membership.organizationId,
        name: "CRM Administrator",
        scopeLevel: "organization",
      });
      tx.persist(role);
      for (const code of crmPermissions) {
        let permission = await tx.findOne(Permission, { code });
        permission ??= new Permission({ code, name: code });
        tx.persist(permission);
        if (!(await tx.findOne(RolePermission, { roleId: role.id, permissionId: permission.id })))
          tx.persist(new RolePermission({ roleId: role.id, permissionId: permission.id }));
      }
      if (!(await tx.findOne(UserRole, { userId, roleId: role.id, deletedAt: null })))
        tx.persist(new UserRole({
          tenantId: membership.tenantId,
          organizationId: membership.organizationId,
          userId,
          roleId: role.id,
          scopeLevel: "organization",
        }));
      await tx.flush();
      return { tenantId: membership.tenantId, organizationId: membership.organizationId };
    });
  }

  async onApplicationShutdown(): Promise<void> { if (this.#orm) await closeMikroOrm(await this.#orm); }
  #getOrm(): Promise<TnviosMikroOrm> {
    this.#orm ??= initializeMikroOrm({ debug: false, entities: [UserSchema, ...ORGANIZATION_SCHEMAS, ...POLICY_SCHEMAS, ...CRM_SCHEMAS], environment: validateEnvironment(process.env) });
    return this.#orm;
  }
}

type CrmEntity = CrmCustomer | CrmContact | CrmLead | CrmOpportunity | CrmActivity;
type CrmType<Entity extends CrmEntity> = { new (...args: never[]): Entity };
function crmEntityType(entity: CrmEntity): string {
  if (entity instanceof CrmCustomer) return "customer";
  if (entity instanceof CrmContact) return "contact";
  if (entity instanceof CrmLead) return "lead";
  if (entity instanceof CrmOpportunity) return "opportunity";
  return "activity";
}
