import { BadRequestException, Body, Controller, Get, Post } from "@nestjs/common";
import { parseEntityId } from "@tnvios/database/identifiers";
import { requestContextStore } from "@tnvios/request-context";
import {
  BusinessUnit,
  Department,
  Group,
  Membership,
  Organization,
  Team,
  Tenant,
} from "@tnvios/organization";
import {
  RequireOrganizationContext,
  RequireTenantContext,
  SkipOrganizationContext,
} from "./context.decorator.js";
import {
  CreateBusinessUnitDto,
  CreateDepartmentDto,
  CreateGroupDto,
  CreateMembershipDto,
  CreateOrganizationDto,
  CreateTeamDto,
  CreateTenantDto,
} from "./organization.dto.js";
import { OrganizationPersistence } from "./organization.persistence.js";
import { RequirePermission } from "../policies/permission.decorator.js";

@Controller("organization")
export class OrganizationController {
  constructor(private readonly persistence: OrganizationPersistence) {}

  @Get("tenants") @RequireTenantContext() listTenants() {
    return this.scoped(Tenant);
  }
  @Post("tenants") @SkipOrganizationContext() async createTenant(@Body() body: CreateTenantDto) {
    return this.created(new Tenant(body));
  }
  @Get("groups") @RequireTenantContext() listGroups() {
    return this.scoped(Group);
  }
  @Post("groups") @RequireTenantContext() createGroup(@Body() body: CreateGroupDto) {
    return this.created(new Group({ ...body, tenantId: this.tenantId() }));
  }
  @Get("organizations") @RequireTenantContext() listOrganizations() {
    return this.scoped(Organization);
  }
  @Post("organizations") @RequireTenantContext() createOrganization(
    @Body() body: CreateOrganizationDto,
  ) {
    return this.created(new Organization({ ...body, tenantId: this.tenantId() }));
  }
  @Get("business-units")
  @RequireOrganizationContext()
  @RequirePermission("organization.business_unit.read")
  listBusinessUnits() {
    return this.organizationScoped(BusinessUnit);
  }
  @Post("business-units")
  @RequireOrganizationContext()
  @RequirePermission("organization.business_unit.create")
  createBusinessUnit(@Body() body: CreateBusinessUnitDto) {
    return this.created(new BusinessUnit({ ...body, ...this.organizationIds() }));
  }
  @Get("departments")
  @RequireOrganizationContext()
  @RequirePermission("organization.department.read")
  listDepartments() {
    return this.organizationScoped(Department);
  }
  @Post("departments")
  @RequireOrganizationContext()
  @RequirePermission("organization.department.create")
  async createDepartment(@Body() body: CreateDepartmentDto) {
    const department = new Department({
      ...body,
      businessUnitId: parseEntityId<"business_unit">(body.businessUnitId),
      ...this.organizationIds(),
    });
    await this.assertHierarchy(department);
    return this.created(department);
  }
  @Get("teams")
  @RequireOrganizationContext()
  @RequirePermission("organization.team.read")
  listTeams() {
    return this.organizationScoped(Team);
  }
  @Post("teams")
  @RequireOrganizationContext()
  @RequirePermission("organization.team.create")
  async createTeam(@Body() body: CreateTeamDto) {
    const team = new Team({
      ...body,
      departmentId: parseEntityId<"department">(body.departmentId),
      ...this.organizationIds(),
    });
    await this.assertHierarchy(team);
    return this.created(team);
  }
  @Get("memberships")
  @RequireOrganizationContext()
  @RequirePermission("organization.membership.read")
  listMemberships() {
    return this.organizationScoped(Membership);
  }
  @Post("memberships") @RequireTenantContext() async createMembership(
    @Body() body: CreateMembershipDto,
  ) {
    const membership = new Membership({
      memberType: body.memberType,
      tenantId: this.tenantId(),
      userId: parseEntityId<"user">(body.userId),
      organizationId: parseEntityId<"organization">(body.organizationId),
      businessUnitId: body.businessUnitId
        ? parseEntityId<"business_unit">(body.businessUnitId)
        : null,
      departmentId: body.departmentId ? parseEntityId<"department">(body.departmentId) : null,
      teamId: body.teamId ? parseEntityId<"team">(body.teamId) : null,
    });
    await this.assertHierarchy(membership);
    return this.created(membership);
  }

  private tenantId() {
    const id = requestContextStore.require().tenantId;
    if (!id) throw new Error("Tenant context required.");
    return id;
  }
  private organizationIds() {
    const context = requestContextStore.require();
    if (!context.tenantId || !context.organizationId)
      throw new Error("Organization context required.");
    return { tenantId: context.tenantId, organizationId: context.organizationId };
  }
  private scoped<Entity extends object>(type: { new (...args: never[]): Entity }) {
    return this.collection(this.persistence.list(type, { tenantId: this.tenantId() }));
  }
  private organizationScoped<Entity extends object>(type: { new (...args: never[]): Entity }) {
    return this.collection(this.persistence.list(type, this.organizationIds()));
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
  private async assertHierarchy(
    input: Parameters<OrganizationPersistence["hierarchyReferencesBelong"]>[0],
  ) {
    if (!(await this.persistence.hierarchyReferencesBelong(input))) {
      throw new BadRequestException({
        code: "INVALID_ORGANIZATION_HIERARCHY",
        message: "Hierarchy references do not belong to the tenant and organization.",
      });
    }
  }
}
