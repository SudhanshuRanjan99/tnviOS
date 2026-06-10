import { EntitySchema } from "@mikro-orm/core";
import type {
  FileId,
  FilePermissionId,
  OrganizationId,
  TenantId,
  UserId,
} from "@tnvios/database/contracts";
import { createEntityId, type EntityId } from "@tnvios/database/identifiers";

export const FILE_STATUSES = [
  "pending",
  "uploaded",
  "scanning",
  "available",
  "rejected",
  "deleted",
] as const;
export const FILE_ACCESS_LEVELS = ["read", "manage"] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];
export type FileAccessLevel = (typeof FILE_ACCESS_LEVELS)[number];

export class StoredFile {
  id: FileId = createEntityId<"file">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  storageProvider: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  checksum: string | null;
  status: FileStatus = "pending";
  createdAt = new Date();
  createdBy: UserId;
  deletedAt: Date | null = null;
  deletedBy: UserId | null = null;

  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    storageProvider: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    checksum?: string | null;
    createdBy: UserId;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.storageProvider = required(input.storageProvider, "storageProvider");
    this.storageKey = required(input.storageKey, "storageKey");
    this.fileName = fileName(input.fileName);
    this.mimeType = required(input.mimeType, "mimeType").toLowerCase();
    this.fileSize = fileSize(input.fileSize);
    this.checksum = optional(input.checksum);
    this.createdBy = input.createdBy;
  }

  markUploaded(): void {
    if (this.status !== "pending") throw new InvalidFileStateError(this.status, "uploaded");
    this.status = "uploaded";
  }

  markAvailable(): void {
    if (!["uploaded", "scanning"].includes(this.status)) {
      throw new InvalidFileStateError(this.status, "available");
    }
    this.status = "available";
  }

  markDeleted(userId: UserId, at = new Date()): void {
    if (this.status === "deleted") return;
    this.status = "deleted";
    this.deletedAt = at;
    this.deletedBy = userId;
  }
}

export class FilePermission {
  id: FilePermissionId = createEntityId<"file_permission">();
  tenantId: TenantId;
  organizationId: OrganizationId;
  fileId: FileId;
  entityType: string;
  entityId: EntityId;
  accessLevel: FileAccessLevel;
  createdAt = new Date();
  createdBy: UserId;

  constructor(input: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    fileId: FileId;
    entityType: string;
    entityId: EntityId;
    accessLevel?: FileAccessLevel;
    createdBy: UserId;
  }) {
    this.tenantId = input.tenantId;
    this.organizationId = input.organizationId;
    this.fileId = input.fileId;
    this.entityType = required(input.entityType, "entityType").toLowerCase();
    this.entityId = input.entityId;
    this.accessLevel = input.accessLevel ?? "read";
    this.createdBy = input.createdBy;
  }
}

export const StoredFileSchema = new EntitySchema<StoredFile>({
  class: StoredFile,
  tableName: "files",
  indexes: [
    { name: "files_context_index", properties: ["tenantId", "organizationId", "createdAt"] },
    { name: "files_status_index", properties: ["status"] },
  ],
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    organizationId: { fieldName: "organization_id", type: "uuid" },
    storageProvider: { fieldName: "storage_provider", type: "text" },
    storageKey: { fieldName: "storage_key", type: "text", unique: "files_storage_key_unique" },
    fileName: { fieldName: "file_name", type: "text" },
    mimeType: { fieldName: "mime_type", type: "text" },
    fileSize: { fieldName: "file_size", type: "bigint" },
    checksum: { nullable: true, type: "text" },
    status: { enum: true, items: () => FILE_STATUSES, nativeEnumName: "file_status" },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
    createdBy: { fieldName: "created_by", type: "uuid" },
    deletedAt: { fieldName: "deleted_at", nullable: true, type: "timestamptz" },
    deletedBy: { fieldName: "deleted_by", nullable: true, type: "uuid" },
  },
});

export const FilePermissionSchema = new EntitySchema<FilePermission>({
  class: FilePermission,
  tableName: "file_permissions",
  indexes: [
    { name: "file_permissions_file_index", properties: ["fileId"] },
    { name: "file_permissions_entity_index", properties: ["entityType", "entityId"] },
  ],
  uniques: [
    {
      name: "file_permissions_file_entity_unique",
      properties: ["fileId", "entityType", "entityId"],
    },
  ],
  properties: {
    id: { primary: true, type: "uuid" },
    tenantId: { fieldName: "tenant_id", type: "uuid" },
    organizationId: { fieldName: "organization_id", type: "uuid" },
    fileId: { fieldName: "file_id", type: "uuid" },
    entityType: { fieldName: "entity_type", type: "text" },
    entityId: { fieldName: "entity_id", type: "uuid" },
    accessLevel: {
      enum: true,
      fieldName: "access_level",
      items: () => FILE_ACCESS_LEVELS,
      nativeEnumName: "file_access_level",
    },
    createdAt: { fieldName: "created_at", type: "timestamptz" },
    createdBy: { fieldName: "created_by", type: "uuid" },
  },
});

export const FILE_SCHEMAS = [StoredFileSchema, FilePermissionSchema] as const;

export class InvalidFileFieldError extends Error {
  constructor(field: string) {
    super(`File ${field} is invalid.`);
    this.name = "InvalidFileFieldError";
  }
}
export class InvalidFileStateError extends Error {
  constructor(from: FileStatus, to: FileStatus) {
    super(`File cannot transition from "${from}" to "${to}".`);
    this.name = "InvalidFileStateError";
  }
}
function required(value: string, field: string): string {
  const result = value.trim();
  if (!result) throw new InvalidFileFieldError(field);
  return result;
}
function optional(value: string | null | undefined): string | null {
  const result = value?.trim();
  return result ? result : null;
}
function fileName(value: string): string {
  const result = required(value, "fileName");
  if (result.includes("/") || result.includes("\\") || result === "." || result === "..") {
    throw new InvalidFileFieldError("fileName");
  }
  return result;
}
function fileSize(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new InvalidFileFieldError("fileSize");
  return value;
}
