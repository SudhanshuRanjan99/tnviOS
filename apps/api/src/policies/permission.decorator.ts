import { SetMetadata } from "@nestjs/common";

export const REQUIRED_PERMISSION = Symbol("requiredPermission");
export const RequirePermission = (permissionCode: string) =>
  SetMetadata(REQUIRED_PERMISSION, permissionCode);
export const SkipAuthorization = () => SetMetadata(REQUIRED_PERMISSION, "");
