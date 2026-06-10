import { Injectable } from "@nestjs/common";
import { validateEnvironment } from "@tnvios/config";
import { FileEngine, S3FileStorageProvider } from "@tnvios/files";

import { FilesPersistence } from "./files.persistence.js";

@Injectable()
export class ApiFileEngine {
  #engine?: FileEngine;

  constructor(private readonly persistence: FilesPersistence) {}

  get(): FileEngine {
    if (!this.#engine) {
      const environment = validateEnvironment(process.env);
      this.#engine = new FileEngine(
        this.persistence,
        new S3FileStorageProvider(environment.S3_BUCKET, {
          credentials: {
            accessKeyId: environment.S3_ACCESS_KEY,
            secretAccessKey: environment.S3_SECRET_KEY,
          },
          endpoint: environment.S3_ENDPOINT,
          forcePathStyle: true,
          region: "us-east-1",
        }),
      );
    }
    return this.#engine;
  }
}
