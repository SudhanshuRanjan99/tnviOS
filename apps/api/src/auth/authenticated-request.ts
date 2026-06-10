import type { AuthenticatedPrincipal } from "@tnvios/auth";
import type { UserId } from "@tnvios/database/contracts";
import type { UserStatus } from "@tnvios/identity/users";

const AUTHENTICATED_IDENTITY = Symbol("authenticatedIdentity");
const AUTHENTICATED_PRINCIPAL = Symbol("authenticatedPrincipal");

export interface AuthenticatedIdentity {
  readonly principal: AuthenticatedPrincipal;
  readonly status: UserStatus;
  readonly userId: UserId;
}

export interface AuthenticatedRequest {
  [AUTHENTICATED_IDENTITY]?: AuthenticatedIdentity;
  [AUTHENTICATED_PRINCIPAL]?: AuthenticatedPrincipal;
}

export function getAuthenticatedIdentity(request: object): AuthenticatedIdentity | undefined {
  return (request as AuthenticatedRequest)[AUTHENTICATED_IDENTITY];
}

export function getAuthenticatedPrincipal(request: object): AuthenticatedPrincipal | undefined {
  return (request as AuthenticatedRequest)[AUTHENTICATED_PRINCIPAL];
}

export function setAuthenticatedPrincipal(
  request: object,
  principal: AuthenticatedPrincipal,
): void {
  (request as AuthenticatedRequest)[AUTHENTICATED_PRINCIPAL] = principal;
}

export function setAuthenticatedIdentity(request: object, identity: AuthenticatedIdentity): void {
  (request as AuthenticatedRequest)[AUTHENTICATED_IDENTITY] = identity;
}
