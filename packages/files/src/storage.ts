import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface SignedStorageUrl {
  readonly expiresAt: Date;
  readonly method: "GET" | "PUT";
  readonly url: string;
}

export interface FileStorageProvider {
  readonly name: string;
  createUploadUrl(input: {
    storageKey: string;
    mimeType: string;
    expiresInSeconds?: number;
  }): Promise<SignedStorageUrl>;
  createDownloadUrl(input: {
    storageKey: string;
    fileName: string;
    expiresInSeconds?: number;
  }): Promise<SignedStorageUrl>;
  delete(storageKey: string): Promise<void>;
}

type Signer = (
  client: S3Client,
  command: PutObjectCommand | GetObjectCommand,
  options: { expiresIn: number },
) => Promise<string>;

export class S3FileStorageProvider implements FileStorageProvider {
  readonly name = "s3";
  readonly #client: S3Client;

  constructor(
    private readonly bucket: string,
    config: S3ClientConfig,
    private readonly signer: Signer = getSignedUrl,
  ) {
    this.#client = new S3Client(config);
  }

  async createUploadUrl(input: {
    storageKey: string;
    mimeType: string;
    expiresInSeconds?: number;
  }): Promise<SignedStorageUrl> {
    const expiresIn = expiration(input.expiresInSeconds);
    const url = await this.signer(
      this.#client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.storageKey,
        ContentType: input.mimeType,
      }),
      { expiresIn },
    );
    return { expiresAt: new Date(Date.now() + expiresIn * 1_000), method: "PUT", url };
  }

  async createDownloadUrl(input: {
    storageKey: string;
    fileName: string;
    expiresInSeconds?: number;
  }): Promise<SignedStorageUrl> {
    const expiresIn = expiration(input.expiresInSeconds);
    const url = await this.signer(
      this.#client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: input.storageKey,
        ResponseContentDisposition: `attachment; filename="${safeDispositionName(input.fileName)}"`,
      }),
      { expiresIn },
    );
    return { expiresAt: new Date(Date.now() + expiresIn * 1_000), method: "GET", url };
  }

  async delete(storageKey: string): Promise<void> {
    await this.#client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}

export class InvalidSignedUrlExpirationError extends Error {
  constructor() {
    super("Signed URL expiration must be between 1 and 900 seconds.");
    this.name = "InvalidSignedUrlExpirationError";
  }
}
function expiration(value = 300): number {
  if (!Number.isInteger(value) || value < 1 || value > 900) {
    throw new InvalidSignedUrlExpirationError();
  }
  return value;
}
function safeDispositionName(value: string): string {
  return value.replaceAll(/["\r\n]/g, "_");
}
