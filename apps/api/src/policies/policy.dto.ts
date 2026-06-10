import { IsIn, IsOptional, IsString, IsUUID, Matches } from "class-validator";
import { POLICY_EFFECTS, SCOPE_LEVELS, type PolicyEffect, type ScopeLevel } from "@tnvios/policies";
const permissionPattern = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
export class CreatePermissionDto {
  @Matches(permissionPattern) code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}
export class CreateRoleDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(SCOPE_LEVELS) scopeLevel!: ScopeLevel;
}
export class AssignRolePermissionDto {
  @IsUUID() roleId!: string;
  @IsUUID() permissionId!: string;
}
export class AssignUserRoleDto {
  @IsUUID() userId!: string;
  @IsUUID() roleId!: string;
  @IsIn(SCOPE_LEVELS) scopeLevel!: ScopeLevel;
  @IsOptional() @IsUUID() scopeId?: string;
}
export class CreateFieldPermissionDto {
  @IsUUID() roleId!: string;
  @Matches(permissionPattern) permissionCode!: string;
  @IsString() resourceType!: string;
  @IsString() fieldName!: string;
  @IsOptional() @IsIn(POLICY_EFFECTS) effect?: PolicyEffect;
}
export class CreateResourcePermissionDto {
  @IsUUID() userId!: string;
  @Matches(permissionPattern) permissionCode!: string;
  @IsString() resourceType!: string;
  @IsUUID() resourceId!: string;
  @IsOptional() @IsIn(POLICY_EFFECTS) effect?: PolicyEffect;
}
export class EvaluatePermissionDto {
  @Matches(permissionPattern) permissionCode!: string;
  @IsOptional() @IsString() resourceType?: string;
  @IsOptional() @IsUUID() resourceId?: string;
  @IsOptional() @IsUUID() ownerUserId?: string;
}
