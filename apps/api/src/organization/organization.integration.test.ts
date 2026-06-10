import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createEntityId } from "@tnvios/database/identifiers";
import { REQUEST_HEADER_NAMES } from "@tnvios/request-context";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { configureApplication } from "../application.js";
import { RequestContextModule } from "../request-context/request-context.module.js";
import { OrganizationController } from "./organization.controller.js";
import { OrganizationPersistence } from "./organization.persistence.js";

const tenantId = createEntityId<"tenant">();

describe("organization APIs", () => {
  let application: INestApplication | undefined;
  afterEach(async () => application?.close());

  it("scopes organization collections to the request tenant", async () => {
    const list = vi.fn(async () => []);
    await createApplication({ list });
    const response = await request(requireApplication().getHttpServer())
      .get("/api/v1/organization/organizations")
      .set(REQUEST_HEADER_NAMES.tenantId, tenantId)
      .expect(200);

    expect(list).toHaveBeenCalledWith(expect.any(Function), { tenantId });
    expect(response.body).toEqual({
      success: true,
      data: [],
      meta: { page: 1, pageSize: 0, total: 0 },
    });
  });

  it("validates tenant creation input and returns the standard success contract", async () => {
    const save = vi.fn(async () => undefined);
    await createApplication({ save });
    await request(requireApplication().getHttpServer())
      .post("/api/v1/organization/tenants")
      .send({ name: "Acme", slug: "invalid slug" })
      .expect(400);

    const response = await request(requireApplication().getHttpServer())
      .post("/api/v1/organization/tenants")
      .send({ name: "Acme", slug: "acme" })
      .expect(201);
    expect(response.body).toMatchObject({
      success: true,
      data: { name: "Acme", slug: "acme" },
      meta: {},
    });
    expect(save).toHaveBeenCalledOnce();
  });

  async function createApplication(overrides: Record<string, unknown>) {
    const testingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      imports: [RequestContextModule],
      providers: [
        {
          provide: OrganizationPersistence,
          useValue: { list: vi.fn(async () => []), save: vi.fn(), ...overrides },
        },
      ],
    }).compile();
    application = testingModule.createNestApplication();
    configureApplication(application);
    await application.init();
  }
  function requireApplication() {
    if (!application) throw new Error("Test application not initialized.");
    return application;
  }
});
