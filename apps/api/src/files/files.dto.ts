import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

import { FILE_ACCESS_LEVELS, type FileAccessLevel } from "@tnvios/files";

export class RegisterFileDto {
  @IsString() fileName!: string;
  @IsString() mimeType!: string;
  @IsInt() @Min(1) @Max(5_368_709_120) fileSize!: number;
  @IsOptional() @IsString() checksum?: string;
}

export class GrantFilePermissionDto {
  @IsString() entityType!: string;
  @IsUUID() entityId!: string;
  @IsIn(FILE_ACCESS_LEVELS) accessLevel!: FileAccessLevel;
}
