import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import { getAuthenticatedIdentity, getAuthenticatedPrincipal } from "./authenticated-request.js";
import { AuthenticationGuard, parseBearerToken } from "./authentication.guard.js";
import type { ApiFirstLoginProvisioner } from "./first-login.provider.js";
import type { ApiJwtValidator } from "./jwt-validator.provider.js";

const userId = createEntityId<"user">();
const principal = {
  email: "user@example.com",
  keycloakUserId: "keycloak-user-id",
} as const;

describe("parseBearerToken", () => {
  it("extracts a bearer token", () => {
    expect(parseBearerToken("Bearer access-token")).toBe("access-token");
  });

  it.each([undefined, ["Bearer token"], "Basic credentials", "Bearer", "Bearer token with-spaces"])(
    "rejects malformed authorization value %j",
    (value) => {
      expect(parseBearerToken(value)).toBeUndefined();
    },
  );
});

describe("AuthenticationGuard", () => {
  it("allows explicitly public routes without a token", async () => {
    const { guard, validator } = createGuard({ isPublic: true });

    await expect(guard.canActivate(createExecutionContext())).resolves.toBe(true);
    expect(validator.validate).not.toHaveBeenCalled();
  });

  it("validates bearer tokens and attaches the authenticated principal", async () => {
    const request = { headers: { authorization: "Bearer access-token" } };
    const { guard, validator } = createGuard();

    await expect(guard.canActivate(createExecutionContext(request))).resolves.toBe(true);
    expect(validator.validate).toHaveBeenCalledWith("access-token");
    expect(getAuthenticatedPrincipal(request)).toEqual(principal);
    expect(getAuthenticatedIdentity(request)).toEqual({
      principal,
      status: "active",
      userId,
    });
  });

  it("rejects requests without a bearer token", async () => {
    const { guard } = createGuard();

    await expect(guard.canActivate(createExecutionContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("allows pending shadow users to continue to organization membership resolution", async () => {
    const request = { headers: { authorization: "Bearer access-token" } };
    const { guard } = createGuard({ status: "pending" });

    await expect(guard.canActivate(createExecutionContext(request))).resolves.toBe(true);
    expect(getAuthenticatedIdentity(request)?.status).toBe("pending");
  });

  it("denies disabled shadow users", async () => {
    const { guard } = createGuard({ status: "disabled" });
    await expect(
      guard.canActivate(
        createExecutionContext({ headers: { authorization: "Bearer access-token" } }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createGuard(
  options: {
    readonly isPublic?: boolean;
    readonly status?: "active" | "disabled" | "pending";
  } = {},
) {
  const reflector = {
    getAllAndOverride: vi.fn(() => options.isPublic),
  } as unknown as Reflector;
  const validator = {
    validate: vi.fn(async () => principal),
  } as unknown as ApiJwtValidator;
  const provisioner = {
    provision: vi.fn(async () => ({
      created: false,
      status: options.status ?? "active",
      userId,
    })),
  } as unknown as ApiFirstLoginProvisioner;

  return {
    guard: new AuthenticationGuard(reflector, validator, provisioner),
    provisioner,
    validator,
  };
}

function createExecutionContext(
  request: { readonly headers: Readonly<Record<string, string>> } = { headers: {} },
): ExecutionContext {
  return {
    getClass: vi.fn(),
    getHandler: vi.fn(),
    switchToHttp: vi.fn(() => ({
      getRequest: () => request,
    })),
  } as unknown as ExecutionContext;
}
