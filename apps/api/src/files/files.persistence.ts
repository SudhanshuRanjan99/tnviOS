import { Injectable } from "@nestjs/common";
import { AuditLog } from "@tnvios/audit";
import type { OrganizationId, TenantId, UserId } from "@tnvios/database/contracts";
import type { EntityId } from "@tnvios/database/identifiers";
import { OutboxEvent } from "@tnvios/events";
import {
  FilePermission,
  type FileAccessLevel,
  type FileRepository,
  StoredFile,
} from "@tnvios/files";

import { AuditEventsPersistence } from "../events/audit-events.persistence.js";

@Injectable()
export class FilesPersistence implements FileRepository {
  constructor(private readonly persistence: AuditEventsPersistence) {}

  create(file: StoredFile): Promise<void> {
    return this.recordMutation(file, "file.upload.registered", file.createdBy);
  }

  save(file: StoredFile, action: "file.uploaded" | "file.scanned" | "file.deleted"): Promise<void> {
    return this.recordMutation(file, action, file.deletedBy ?? file.createdBy);
  }

  recordDownload(file: StoredFile, userId: UserId): Promise<void> {
    return this.persistence.recordAuditEvent(
      this.audit(file, "file.downloaded", userId),
      this.event(file, "file.downloaded", userId),
    );
  }

  grant(permission: FilePermission): Promise<void> {
    return this.persistence.recordMutation(
      permission,
      new AuditLog({
        tenantId: permission.tenantId,
        organizationId: permission.organizationId,
        userId: permission.createdBy,
        entityType: "file_permission",
        entityId: permission.id,
        action: "file.permission.granted",
        newValues: {
          fileId: permission.fileId,
          entityType: permission.entityType,
          entityId: permission.entityId,
          accessLevel: permission.accessLevel,
        },
      }),
      new OutboxEvent({
        eventType: "file.permission.granted",
        source: "files",
        tenantId: permission.tenantId,
        organizationId: permission.organizationId,
        userId: permission.createdBy,
        aggregateType: "file",
        aggregateId: permission.fileId,
        payload: {
          fileId: permission.fileId,
          entityType: permission.entityType,
          entityId: permission.entityId,
          accessLevel: permission.accessLevel,
        },
      }),
    );
  }

  async findFile(id: StoredFile["id"]): Promise<StoredFile | null> {
    return (await this.persistence.list(StoredFile, { id }))[0] ?? null;
  }

  async hasGrant(
    fileId: StoredFile["id"],
    entityType: string,
    entityId: EntityId,
    access: FileAccessLevel,
  ): Promise<boolean> {
    return (
      (
        await this.persistence.list(FilePermission, {
          fileId,
          entityType,
          entityId,
          accessLevel: access,
        })
      ).length > 0
    );
  }

  list(tenantId: TenantId, organizationId: OrganizationId): Promise<StoredFile[]> {
    return this.persistence.list(StoredFile, {
      tenantId,
      organizationId,
      deletedAt: null,
    });
  }

  private recordMutation(file: StoredFile, action: string, userId: UserId): Promise<void> {
    return this.persistence.recordMutation(
      file,
      this.audit(file, action, userId),
      this.event(file, action, userId),
    );
  }

  private audit(file: StoredFile, action: string, userId: UserId): AuditLog {
    return new AuditLog({
      tenantId: file.tenantId,
      organizationId: file.organizationId,
      userId,
      entityType: "file",
      entityId: file.id,
      action,
      newValues: {
        fileName: file.fileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        status: file.status,
      },
    });
  }

  private event(file: StoredFile, eventType: string, userId: UserId): OutboxEvent {
    return new OutboxEvent({
      eventType,
      source: "files",
      tenantId: file.tenantId,
      organizationId: file.organizationId,
      userId,
      aggregateType: "file",
      aggregateId: file.id,
      payload: {
        fileId: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        status: file.status,
      },
    });
  }
}
