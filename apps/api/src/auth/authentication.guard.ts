import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtValidationError } from "@tnvios/auth";
import { FirstLoginEmailRequiredError } from "@tnvios/identity/first-login";

import {
  setAuthenticatedIdentity,
  setAuthenticatedPrincipal,
  type AuthenticatedRequest,
} from "./authenticated-request.js";
import { ApiFirstLoginProvisioner } from "./first-login.provider.js";
import { IS_PUBLIC_ROUTE } from "./public-route.decorator.js";
import { ApiJwtValidator } from "./jwt-validator.provider.js";

interface RequestWithAuthorization extends AuthenticatedRequest {
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
}

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtValidator: ApiJwtValidator,
    private readonly firstLoginProvisioner: ApiFirstLoginProvisioner,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuthorization>();
    const accessToken = parseBearerToken(request.headers.authorization);

    if (accessToken === undefined) {
      throw createUnauthorizedException();
    }

    try {
      const principal = await this.jwtValidator.validate(accessToken);
      setAuthenticatedPrincipal(request, principal);
      const provisionedIdentity = await this.firstLoginProvisioner.provision(principal);

      if (provisionedIdentity.status === "disabled") {
        throw createForbiddenException("ACCOUNT_DISABLED", "The Tnvios account is disabled.");
      }

      setAuthenticatedIdentity(request, {
        principal,
        status: provisionedIdentity.status,
        userId: provisionedIdentity.userId,
      });
      return true;
    } catch (error) {
      if (error instanceof JwtValidationError || error instanceof FirstLoginEmailRequiredError) {
        throw createUnauthorizedException();
      }

      throw error;
    }
  }
}

export function parseBearerToken(
  value: string | readonly string[] | undefined,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = /^Bearer ([^\s]+)$/i.exec(value);
  return match?.[1];
}

function createUnauthorizedException(): UnauthorizedException {
  return new UnauthorizedException({
    code: "UNAUTHENTICATED",
    message: "Authentication required.",
  });
}

function createForbiddenException(code: string, message: string): ForbiddenException {
  return new ForbiddenException({ code, message });
}
