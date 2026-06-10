import { Controller, Get, type INestApplication, Req } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtValidationError } from "@tnvios/auth";
import { createEntityId } from "@tnvios/database/identifiers";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { configureApplication } from "../application.js";
import { AuthModule } from "./auth.module.js";
import { getAuthenticatedIdentity } from "./authenticated-request.js";
import { ApiFirstLoginProvisioner } from "./first-login.provider.js";
import { ApiJwtValidator } from "./jwt-validator.provider.js";

const userId = createEntityId<"user">();
const principal = {
  email: "user@example.com",
  keycloakUserId: "keycloak-user-id",
} as const;

@Controller("auth-test")
class ProtectedAuthTestController {
  @Get()
  getIdentity(@Req() request: object) {
    const identity = getAuthenticatedIdentity(request);

    return {
      status: identity?.status,
      userId: identity?.userId,
    };
  }
}

describe("protected route authentication", () => {
  let application: INestApplication | undefined;

  afterEach(async () => {
    await application?.close();
  });

  it("returns the unauthenticated contract when a bearer token is missing", async () => {
    await createTestApplication();

    const response = await request(requireApplication().getHttpServer())
      .get("/api/v1/auth-test")
      .expect(401);

    expect(response.body).toMatchObject({
      code: "UNAUTHENTICATED",
      message: "Authentication required.",
    });
  });

  it("returns the unauthenticated contract for an invalid access token", async () => {
    const provision = vi.fn();
    await createTestApplication({
      provision,
      validate: vi.fn(async () => {
        throw new JwtValidationError();
      }),
    });

    const response = await request(requireApplication().getHttpServer())
      .get("/api/v1/auth-test")
      .set("authorization", "Bearer invalid-token")
      .expect(401);

    expect(response.body.code).toBe("UNAUTHENTICATED");
    expect(provision).not.toHaveBeenCalled();
  });

  it("attaches active Tnvios identity to authenticated requests", async () => {
    await createTestApplication();

    const response = await request(requireApplication().getHttpServer())
      .get("/api/v1/auth-test")
      .set("authorization", "Bearer valid-token")
      .expect(200);

    expect(response.body).toEqual({ status: "active", userId });
  });

  it("allows pending shadow users to continue to membership resolution", async () => {
    await createTestApplication({
      provision: vi.fn(async () => ({ created: false, status: "pending" as const, userId })),
    });

    const response = await request(requireApplication().getHttpServer())
      .get("/api/v1/auth-test")
      .set("authorization", "Bearer valid-token")
      .expect(200);

    expect(response.body).toEqual({ status: "pending", userId });
  });

  it("denies authenticated disabled shadow users", async () => {
    await createTestApplication({
      provision: vi.fn(async () => ({ created: false, status: "disabled" as const, userId })),
    });

    const response = await request(requireApplication().getHttpServer())
      .get("/api/v1/auth-test")
      .set("authorization", "Bearer valid-token")
      .expect(403);

    expect(response.body).toMatchObject({ code: "ACCOUNT_DISABLED" });
  });

  async function createTestApplication(
    options: {
      readonly provision?: ReturnType<typeof vi.fn>;
      readonly validate?: ReturnType<typeof vi.fn>;
    } = {},
  ): Promise<void> {
    const testingModule = await Test.createTestingModule({
      controllers: [ProtectedAuthTestController],
      imports: [AuthModule],
    })
      .overrideProvider(ApiJwtValidator)
      .useValue({
        validate: options.validate ?? vi.fn(async () => principal),
      })
      .overrideProvider(ApiFirstLoginProvisioner)
      .useValue({
        provision:
          options.provision ??
          vi.fn(async () => ({ created: false, status: "active" as const, userId })),
      })
      .compile();

    application = testingModule.createNestApplication();
    configureApplication(application);
    await application.init();
  }

  function requireApplication(): INestApplication {
    if (application === undefined) {
      throw new Error("Test application is not initialized.");
    }

    return application;
  }
});
