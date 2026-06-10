import { IsArray, IsInt, IsObject, IsOptional, IsString, Matches, Max, Min } from "class-validator";
export class RegisterEventDto {
  @Matches(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/) eventType!: string;
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsString() publisher!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) consumers?: string[];
  @IsOptional() @IsObject() schema?: Record<string, unknown>;
  @IsOptional() @IsString() description?: string;
}
export class ProcessOutboxDto {
  @IsOptional() @IsInt() @Min(1) @Max(500) limit?: number;
}
