import { IsArray, IsEmail, IsIn, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

import { NOTIFICATION_CHANNELS, type NotificationChannel } from "@tnvios/notifications";

export class CreateNotificationTemplateDto {
  @IsOptional() @IsUUID() tenantId?: string;
  @IsString() key!: string;
  @IsIn(NOTIFICATION_CHANNELS) channel!: NotificationChannel;
  @IsString() subject!: string;
  @IsString() body!: string;
}

export class SendNotificationDto {
  @IsUUID() tenantId!: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsUUID() userId!: string;
  @IsString() templateKey!: string;
  @IsArray() @IsIn(NOTIFICATION_CHANNELS, { each: true }) channels!: NotificationChannel[];
  @IsObject() variables!: Record<string, string | number | boolean | null>;
  @IsOptional() @IsEmail() recipient?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
