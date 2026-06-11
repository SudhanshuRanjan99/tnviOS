import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsEmail, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { CRM_ACTIVITY_TYPES, type CrmActivityType } from "@tnvios/crm";

export class CreateCrmCustomerDto {
  @IsString() name!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsUUID() ownerUserId?: string;
}
export class CreateCrmContactDto {
  @IsUUID() customerId!: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsBoolean() primary?: boolean;
}
export class CreateCrmLeadDto {
  @IsString() name!: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsNumber() @Min(0) estimatedValue?: number;
  @IsOptional() @IsUUID() assignedTo?: string;
}
export class CreateCrmOpportunityDto {
  @IsUUID() customerId!: string;
  @IsOptional() @IsUUID() leadId?: string;
  @IsString() name!: string;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) probability?: number;
  @IsOptional() @Type(() => Date) @IsDate() expectedCloseDate?: Date;
  @IsOptional() @IsUUID() ownerUserId?: string;
}
export class CloseCrmOpportunityDto {
  @IsIn(["won", "lost"]) outcome!: "won" | "lost";
}
export class CreateCrmActivityDto {
  @IsString() subject!: string;
  @IsIn(CRM_ACTIVITY_TYPES) type!: CrmActivityType;
  @IsIn(["customer", "contact", "lead", "opportunity"]) entityType!: "customer" | "contact" | "lead" | "opportunity";
  @IsUUID() entityId!: string;
  @IsOptional() @IsUUID() assignedTo?: string;
  @IsOptional() @Type(() => Date) @IsDate() dueAt?: Date;
  @IsOptional() @IsString() notes?: string;
}
