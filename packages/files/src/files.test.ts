import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import { FileAccessDeniedError, FileEngine } from "./engine.js";
import { StoredFile } from "./entities.js";
import { InvalidSignedUrlExpirationError, S3FileStorageProvider } from "./storage.js";

const tenantId = createEntityId<"tenant">();
const organizationId = createEntityId<"organization">();
const userId = createEntityId<"user">();
const otherUserId = createEntityId<"user">();

function repository() {
  return {
    create: vi.fn(),
    save: vi.fn(),
    recordDownload: vi.fn(),
    grant: vi.fn(),
    findFile: vi.fn(),
    hasGrant: vi.fn(async () => false),
    list: vi.fn(async () => []),
  };
}

describe("FileEngine", () => {
  it("registers private storage metadata and returns a signed upload URL", async () => {
    const files = repository();
    const storage = {
      name: "s3",
      createUploadUrl: vi.fn(async () => ({
        method: "PUT" as const,
        url: "signed-upload",
        expiresAt: new Date(),
      })),
      createDownloadUrl: vi.fn(),
      delete: vi.fn(),
    };
    const result = await new FileEngine(files, storage).register({
      tenantId,
      organizationId,
      userId,
      fileName: "report.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
    });
    expect(result.upload.url).toBe("signed-upload");
    expect(result.file.storageKey).toContain(`${tenantId}/${organizationId}/`);
    expect(files.create).toHaveBeenCalledWith(result.file);
  });

  it("denies downloads without ownership or an explicit grant", async () => {
    const files = repository();
    const file = new StoredFile({
      tenantId,
      organizationId,
      storageProvider: "s3",
      storageKey: "key",
      fileName: "report.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      createdBy: userId,
    });
    file.markUploaded();
    await expect(
      new FileEngine(files, {
        name: "s3",
        createUploadUrl: vi.fn(),
        createDownloadUrl: vi.fn(),
        delete: vi.fn(),
      }).download(file, otherUserId),
    ).rejects.toBeInstanceOf(FileAccessDeniedError);
  });

  it("does not issue download URLs until scanning marks a file available", async () => {
    const files = repository();
    const file = new StoredFile({
      tenantId,
      organizationId,
      storageProvider: "s3",
      storageKey: "key",
      fileName: "report.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      createdBy: userId,
    });
    file.markUploaded();
    const storage = {
      name: "s3",
      createUploadUrl: vi.fn(),
      createDownloadUrl: vi.fn(async () => ({
        method: "GET" as const,
        url: "signed",
        expiresAt: new Date(),
      })),
      delete: vi.fn(),
    };
    const engine = new FileEngine(files, storage);
    await expect(engine.download(file, userId)).rejects.toThrow("not available");
    await engine.approveScan(file);
    await expect(engine.download(file, userId)).resolves.toMatchObject({ url: "signed" });
    expect(files.recordDownload).toHaveBeenCalledWith(file, userId);
  });

  it("allows users with an explicit manage grant to complete an upload", async () => {
    const files = repository();
    files.hasGrant.mockResolvedValue(true);
    const file = new StoredFile({
      tenantId,
      organizationId,
      storageProvider: "s3",
      storageKey: "key",
      fileName: "report.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      createdBy: userId,
    });
    const engine = new FileEngine(files, {
      name: "s3",
      createUploadUrl: vi.fn(),
      createDownloadUrl: vi.fn(),
      delete: vi.fn(),
    });
    await expect(engine.complete(file, otherUserId)).resolves.toMatchObject({ status: "uploaded" });
    expect(files.hasGrant).toHaveBeenCalledWith(file.id, "user", otherUserId, "manage");
  });
});

describe("S3FileStorageProvider", () => {
  it("creates short-lived upload and download URLs", async () => {
    const signer = vi.fn(async () => "signed");
    const provider = new S3FileStorageProvider("bucket", { region: "us-east-1" }, signer);
    await expect(
      provider.createUploadUrl({ storageKey: "key", mimeType: "text/plain", expiresInSeconds: 60 }),
    ).resolves.toMatchObject({ method: "PUT", url: "signed" });
    await expect(
      provider.createDownloadUrl({
        storageKey: "key",
        fileName: "file.txt",
        expiresInSeconds: 901,
      }),
    ).rejects.toBeInstanceOf(InvalidSignedUrlExpirationError);
  });
});
