import type { OrganizationId, TenantId, UserId } from "@tnvios/database/contracts";
import type { EntityId } from "@tnvios/database/identifiers";

import { FilePermission, type FileAccessLevel, StoredFile } from "./entities.js";
import type { FileStorageProvider, SignedStorageUrl } from "./storage.js";

export interface FileRepository {
  create(file: StoredFile): Promise<void>;
  save(file: StoredFile, action: "file.uploaded" | "file.scanned" | "file.deleted"): Promise<void>;
  recordDownload(file: StoredFile, userId: UserId): Promise<void>;
  grant(permission: FilePermission): Promise<void>;
  findFile(id: StoredFile["id"]): Promise<StoredFile | null>;
  hasGrant(
    fileId: StoredFile["id"],
    entityType: string,
    entityId: EntityId,
    access: FileAccessLevel,
  ): Promise<boolean>;
  list(tenantId: TenantId, organizationId: OrganizationId): Promise<StoredFile[]>;
}

export interface RegisterFileInput {
  readonly tenantId: TenantId;
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly fileName: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly checksum?: string | null;
}

export class FileEngine {
  constructor(
    private readonly repository: FileRepository,
    private readonly storage: FileStorageProvider,
  ) {}

  async register(
    input: RegisterFileInput,
  ): Promise<{ file: StoredFile; upload: SignedStorageUrl }> {
    const file = new StoredFile({
      ...input,
      storageProvider: this.storage.name,
      storageKey: storageKey(input),
      createdBy: input.userId,
    });
    await this.repository.create(file);
    const upload = await this.storage.createUploadUrl({
      storageKey: file.storageKey,
      mimeType: file.mimeType,
    });
    return { file, upload };
  }

  async complete(file: StoredFile, userId: UserId): Promise<StoredFile> {
    await this.assertManage(file, userId);
    file.markUploaded();
    await this.repository.save(file, "file.uploaded");
    return file;
  }

  async approveScan(file: StoredFile): Promise<StoredFile> {
    file.markAvailable();
    await this.repository.save(file, "file.scanned");
    return file;
  }

  async download(file: StoredFile, userId: UserId): Promise<SignedStorageUrl> {
    await this.assertRead(file, userId);
    if (file.status !== "available") throw new FileUnavailableError();
    const signed = await this.storage.createDownloadUrl({
      storageKey: file.storageKey,
      fileName: file.fileName,
    });
    await this.repository.recordDownload(file, userId);
    return signed;
  }

  async delete(file: StoredFile, userId: UserId): Promise<void> {
    await this.assertManage(file, userId);
    await this.storage.delete(file.storageKey);
    file.markDeleted(userId);
    await this.repository.save(file, "file.deleted");
  }

  async grant(
    file: StoredFile,
    actorUserId: UserId,
    entityType: string,
    entityId: EntityId,
    accessLevel: FileAccessLevel,
  ): Promise<FilePermission> {
    await this.assertManage(file, actorUserId);
    const permission = new FilePermission({
      tenantId: file.tenantId,
      organizationId: file.organizationId,
      fileId: file.id,
      entityType,
      entityId,
      accessLevel,
      createdBy: actorUserId,
    });
    await this.repository.grant(permission);
    return permission;
  }

  private async assertRead(file: StoredFile, userId: UserId): Promise<void> {
    if (file.createdBy === userId) return;
    if (await this.repository.hasGrant(file.id, "user", userId, "read")) return;
    if (await this.repository.hasGrant(file.id, "user", userId, "manage")) return;
    throw new FileAccessDeniedError();
  }

  private async assertManage(file: StoredFile, userId: UserId): Promise<void> {
    if (file.createdBy === userId) return;
    if (await this.repository.hasGrant(file.id, "user", userId, "manage")) return;
    throw new FileAccessDeniedError();
  }
}

export class FileAccessDeniedError extends Error {
  constructor() {
    super("File access denied.");
    this.name = "FileAccessDeniedError";
  }
}
export class FileUnavailableError extends Error {
  constructor() {
    super("File is not available for download.");
    this.name = "FileUnavailableError";
  }
}
function storageKey(input: RegisterFileInput): string {
  const safeName = input.fileName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  return `${input.tenantId}/${input.organizationId}/${crypto.randomUUID()}/${safeName}`;
}
