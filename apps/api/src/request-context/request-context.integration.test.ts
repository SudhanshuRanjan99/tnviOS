import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createEntityId, isUuidV7 } from "@tnvios/database/identifiers";
import { REQUEST_HEADER_NAMES } from "@tnvios/request-context";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { AppModule } from "../app.module.js";
import { configureApplication } from "../application.js";

describe("request context middleware", () => {
  let application: INestApplication | undefined;

  afterEach(async () => {
    await application?.close();
  });

  async function createTestApplication(): Promise<INestApplication> {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const testApplication = testingModule.createNestApplication();
    configureApplication(testApplication);
    await testApplication.init();
    application = testApplication;

    return testApplication;
  }

  it("generates and returns a correlation ID", async () => {
    const testApplication = await createTestApplication();
    const response = await request(testApplication.getHttpServer())
      .get("/api/v1/health")
      .expect(200);

    expect(isUuidV7(String(response.headers[REQUEST_HEADER_NAMES.correlationId]))).toBe(true);
  });

  it("preserves a supplied correlation ID", async () => {
    const testApplication = await createTestApplication();
    const correlationId = createEntityId<"correlation">();
    const response = await request(testApplication.getHttpServer())
      .get("/api/v1/health")
      .set(REQUEST_HEADER_NAMES.correlationId, correlationId)
      .expect(200);

    expect(response.headers[REQUEST_HEADER_NAMES.correlationId]).toBe(correlationId);
  });

  it("rejects invalid context headers", async () => {
    const testApplication = await createTestApplication();

    await request(testApplication.getHttpServer())
      .get("/api/v1/health")
      .set(REQUEST_HEADER_NAMES.tenantId, "not-a-uuid")
      .expect(400);
  });
});
