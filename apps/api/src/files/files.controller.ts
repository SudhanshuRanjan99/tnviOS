import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";

import { RequireOrganizationContext } from "../organization/context.decorator.js";
import { getResolvedOrganizationContext } from "../organization/resolved-context.js";
import { RequirePermission } from "../policies/permission.decorator.js";
import { GrantFilePermissionDto, RegisterFileDto } from "./files.dto.js";
import { FilesService } from "./files.service.js";

@Controller("files")
@RequireOrganizationContext()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  @RequirePermission("system.file.read")
  async list(@Req() request: object) {
    const data = await this.files.list(this.context(request));
    return {
      success: true as const,
      data,
      meta: { page: 1, pageSize: data.length, total: data.length },
    };
  }

  @Post()
  @RequirePermission("system.file.create")
  async register(@Req() request: object, @Body() body: RegisterFileDto) {
    return this.item(this.files.register(this.context(request), body));
  }

  @Post(":id/complete")
  @RequirePermission("system.file.update")
  async complete(@Req() request: object, @Param("id") id: string) {
    return this.item(this.files.complete(this.context(request), id));
  }

  @Post(":id/download-url")
  @RequirePermission("system.file.read")
  async download(@Req() request: object, @Param("id") id: string) {
    return this.item(this.files.download(this.context(request), id));
  }

  @Patch(":id/permissions")
  @RequirePermission("system.file.manage")
  async grant(
    @Req() request: object,
    @Param("id") id: string,
    @Body() body: GrantFilePermissionDto,
  ) {
    return this.item(
      this.files.grant(this.context(request), id, body.entityType, body.entityId, body.accessLevel),
    );
  }

  @Delete(":id")
  @RequirePermission("system.file.delete")
  async delete(@Req() request: object, @Param("id") id: string) {
    await this.files.delete(this.context(request), id);
    return { success: true as const, data: { id }, meta: {} };
  }

  private context(request: object) {
    const context = getResolvedOrganizationContext(request);
    if (!context) throw new Error("Resolved organization context required.");
    return context;
  }

  private async item<Entity>(entity: Promise<Entity>) {
    return { success: true as const, data: await entity, meta: {} };
  }
}
