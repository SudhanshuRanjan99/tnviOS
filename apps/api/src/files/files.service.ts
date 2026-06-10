import { Injectable } from "@nestjs/common";
import type { EntityId } from "@tnvios/database/identifiers";
import { type FileAccessLevel, StoredFile } from "@tnvios/files";
import type { ResolvedOrganizationContext } from "@tnvios/organization";

import { ApiFileEngine } from "./file-engine.provider.js";
import type { RegisterFileDto } from "./files.dto.js";
import { FilesPersistence } from "./files.persistence.js";

@Injectable()
export class FilesService {
  constructor(
    private readonly persistence: FilesPersistence,
    private readonly engine: ApiFileEngine,
  ) {}

  async list(context: ResolvedOrganizationContext): Promise<StoredFile[]> {
    const files = await this.persistence.list(context.tenantId, context.organizationId);
    const accessible = await Promise.all(
      files.map(async (file) => ({
        accessible:
          file.createdBy === context.userId ||
          (await this.persistence.hasGrant(file.id, "user", context.userId, "read")) ||
          (await this.persistence.hasGrant(file.id, "user", context.userId, "manage")),
        file,
      })),
    );
    return accessible.filter(({ accessible: allowed }) => allowed).map(({ file }) => file);
  }

  register(context: ResolvedOrganizationContext, input: RegisterFileDto) {
    return this.engine.get().register({
      ...input,
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      userId: context.userId,
    });
  }

  async complete(context: ResolvedOrganizationContext, id: string): Promise<StoredFile> {
    return this.engine.get().complete(await this.requireFile(context, id), context.userId);
  }

  async download(context: ResolvedOrganizationContext, id: string) {
    return this.engine.get().download(await this.requireFile(context, id), context.userId);
  }

  async delete(context: ResolvedOrganizationContext, id: string): Promise<void> {
    await this.engine.get().delete(await this.requireFile(context, id), context.userId);
  }

  async grant(
    context: ResolvedOrganizationContext,
    id: string,
    entityType: string,
    entityId: string,
    accessLevel: FileAccessLevel,
  ) {
    return this.engine
      .get()
      .grant(
        await this.requireFile(context, id),
        context.userId,
        entityType,
        entityId as EntityId,
        accessLevel,
      );
  }

  private async requireFile(context: ResolvedOrganizationContext, id: string): Promise<StoredFile> {
    const file = await this.persistence.findFile(id as StoredFile["id"]);
    if (
      !file ||
      file.tenantId !== context.tenantId ||
      file.organizationId !== context.organizationId ||
      file.deletedAt !== null
    ) {
      throw new Error("File not found.");
    }
    return file;
  }
}
