import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { AppModule } from "../app.module.js";
import { configureApplication } from "../application.js";

describe("GET /api/v1/health", () => {
  let application: INestApplication | undefined;

  afterEach(async () => {
    await application?.close();
  });

  it("exposes the API health contract", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    application = testingModule.createNestApplication();
    configureApplication(application);
    await application.init();

    const response = await request(application.getHttpServer()).get("/api/v1/health").expect(200);

    expect(response.body).toEqual({
      data: {
        service: "api",
        status: "ok",
      },
      meta: {},
      success: true,
    });
  });
});
