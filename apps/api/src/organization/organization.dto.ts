import { IsIn, IsOptional, IsString, IsUUID, Matches } from "class-validator";
import { MEMBER_TYPES, type MemberType } from "@tnvios/organization";

export class CreateTenantDto {
  @IsString() name!: string;
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i) slug!: string;
  @IsOptional() @IsString() subscriptionPlan?: string;
}
export class CreateGroupDto {
  @IsString() name!: string;
  @IsOptional() @IsString() legalName?: string;
}
export class CreateOrganizationDto {
  @IsString() name!: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() registrationNumber?: string;
  @Matches(/^[a-zA-Z]{2}$/) country!: string;
  @Matches(/^[a-zA-Z]{3}$/) currency!: string;
}
export class CreateBusinessUnitDto {
  @IsString() name!: string;
  @IsString() code!: string;
  @IsOptional() @IsString() description?: string;
}
export class CreateDepartmentDto {
  @IsUUID() businessUnitId!: string;
  @IsString() name!: string;
  @IsString() code!: string;
}
export class CreateTeamDto {
  @IsUUID() departmentId!: string;
  @IsString() name!: string;
}
export class CreateMembershipDto {
  @IsUUID() userId!: string;
  @IsUUID() organizationId!: string;
  @IsOptional() @IsUUID() businessUnitId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() teamId?: string;
  @IsIn(MEMBER_TYPES) memberType!: MemberType;
}
