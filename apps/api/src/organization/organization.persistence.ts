import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { AuditLog } from "@tnvios/audit";
import { validateEnvironment } from "@tnvios/config";
import { closeMikroOrm, initializeMikroOrm, type TnviosMikroOrm } from "@tnvios/database";
import type {
  BusinessUnitId,
  DepartmentId,
  OrganizationId,
  TeamId,
  TenantId,
  UserId,
} from "@tnvios/database/contracts";
import type { EntityId } from "@tnvios/database/identifiers";
import { OutboxEvent } from "@tnvios/events";
import { UserSchema } from "@tnvios/identity/users";
import {
  BusinessUnit,
  Department,
  Group,
  Membership,
  ORGANIZATION_SCHEMAS,
  Organization,
  OrganizationContextResolver,
  Team,
  Tenant,
  type OrganizationContextInput,
  type ResolvedOrganizationContext,
} from "@tnvios/organization";
import { requestContextStore } from "@tnvios/request-context";

import { AuditEventsPersistence } from "../events/audit-events.persistence.js";

@Injectable()
export class OrganizationPersistence implements OnApplicationShutdown {
  #orm?: Promise<TnviosMikroOrm>;

  constructor(private readonly auditEvents: AuditEventsPersistence) {}

  async save(entity: object): Promise<void> {
    const eventType = organizationEventType(entity);
    if (eventType === null) {
      const em = (await this.#getOrm()).em.fork();
      em.persist(entity);
      await em.flush();
      return;
    }

    const scoped = entity as {
      id: EntityId;
      tenantId?: TenantId;
      organizationId?: OrganizationId;
    };
    const tenantId = scoped.tenantId ?? (entity instanceof Tenant ? entity.id : undefined);
    if (tenantId === undefined) throw new Error("Organization mutation requires tenant context.");
    const correlationId = requestContextStore.get()?.correlationId ?? null;
    const entityType = eventType.split(".")[1] ?? "organization";

    await this.auditEvents.recordMutation(
      entity,
      new AuditLog({
        tenantId,
        organizationId: scoped.organizationId ?? null,
        entityType,
        entityId: scoped.id,
        action: "created",
        newValues: { ...entity },
        correlationId,
      }),
      new OutboxEvent({
        tenantId,
        organizationId: scoped.organizationId ?? null,
        eventType,
        source: "organization",
        aggregateType: entityType,
        aggregateId: scoped.id,
        payload: { id: scoped.id },
        correlationId,
      }),
    );
  }

  async list<Entity extends object>(
    entity: { new (...args: never[]): Entity },
    where: object = {},
  ): Promise<Entity[]> {
    return (await this.#getOrm()).em.fork().find(entity, { ...where, deletedAt: null } as never);
  }

  async resolve(
    userId: UserId,
    input: OrganizationContextInput,
  ): Promise<ResolvedOrganizationContext> {
    const em = (await this.#getOrm()).em.fork();
    return new OrganizationContextResolver({
      tenantExists: async (tenantId) =>
        (await em.count(Tenant, { id: tenantId, status: "active", deletedAt: null })) > 0,
      organizationBelongsToTenant: async (organizationId, tenantId) =>
        (await em.count(Organization, {
          id: organizationId,
          tenantId,
          status: "active",
          deletedAt: null,
        })) > 0,
      findActiveMembership: (memberUserId, tenantId, organizationId) =>
        em.findOne(Membership, {
          userId: memberUserId,
          tenantId,
          organizationId,
          status: "active",
          deletedAt: null,
        }),
      hierarchyBelongsToOrganization: async (context) => {
        if (
          context.businessUnitId !== null &&
          (await em.count(BusinessUnit, {
            id: context.businessUnitId,
            tenantId: context.tenantId,
            organizationId: context.organizationId,
            status: "active",
            deletedAt: null,
          })) === 0
        )
          return false;
        if (
          context.departmentId !== null &&
          (await em.count(Department, {
            id: context.departmentId,
            tenantId: context.tenantId,
            organizationId: context.organizationId,
            ...(context.businessUnitId === null ? {} : { businessUnitId: context.businessUnitId }),
            status: "active",
            deletedAt: null,
          })) === 0
        )
          return false;
        if (
          context.teamId !== null &&
          (await em.count(Team, {
            id: context.teamId,
            tenantId: context.tenantId,
            organizationId: context.organizationId,
            ...(context.departmentId === null ? {} : { departmentId: context.departmentId }),
            status: "active",
            deletedAt: null,
          })) === 0
        )
          return false;
        return true;
      },
    }).resolve(userId, input);
  }

  async tenantExists(tenantId: TenantId): Promise<boolean> {
    return (
      (await (await this.#getOrm()).em
        .fork()
        .count(Tenant, { id: tenantId, status: "active", deletedAt: null })) > 0
    );
  }

  async userHasTenantAccess(userId: UserId, tenantId: TenantId): Promise<boolean> {
    return (
      (await (await this.#getOrm()).em
        .fork()
        .count(Membership, { userId, tenantId, status: "active", deletedAt: null })) > 0
    );
  }

  async hierarchyReferencesBelong(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    businessUnitId?: BusinessUnitId | null;
    departmentId?: DepartmentId | null;
    teamId?: TeamId | null;
  }): Promise<boolean> {
    const em = (await this.#getOrm()).em.fork();
    if (
      (await em.count(Organization, {
        id: input.organizationId,
        tenantId: input.tenantId,
        deletedAt: null,
      })) === 0
    )
      return false;
    if (
      input.businessUnitId &&
      (await em.count(BusinessUnit, {
        id: input.businessUnitId,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        deletedAt: null,
      })) === 0
    )
      return false;
    if (
      input.departmentId &&
      (await em.count(Department, {
        id: input.departmentId,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        ...(input.businessUnitId ? { businessUnitId: input.businessUnitId } : {}),
        deletedAt: null,
      })) === 0
    )
      return false;
    if (
      input.teamId &&
      (await em.count(Team, {
        id: input.teamId,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        deletedAt: null,
      })) === 0
    )
      return false;
    return true;
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.#orm) await closeMikroOrm(await this.#orm);
  }

  #getOrm(): Promise<TnviosMikroOrm> {
    this.#orm ??= initializeMikroOrm({
      debug: false,
      entities: [UserSchema, ...ORGANIZATION_SCHEMAS],
      environment: validateEnvironment(process.env),
    });
    return this.#orm;
  }
}

export const ORGANIZATION_ENTITY_TYPES = {
  tenants: Tenant,
  groups: Group,
  organizations: Organization,
  businessUnits: BusinessUnit,
  departments: Department,
  teams: Team,
  memberships: Membership,
} as const;

function organizationEventType(entity: object): string | null {
  if (entity instanceof Tenant) return "organization.tenant.created";
  if (entity instanceof Group) return "organization.group.created";
  if (entity instanceof Organization) return "organization.organization.created";
  if (entity instanceof BusinessUnit) return "organization.business_unit.created";
  if (entity instanceof Department) return "organization.department.created";
  if (entity instanceof Team) return "organization.team.created";
  if (entity instanceof Membership) return "organization.membership.created";
  return null;
}
