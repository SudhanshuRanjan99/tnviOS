import { Injectable } from "@nestjs/common";
import type { AuthenticatedPrincipal } from "@tnvios/auth";
import type { FirstLoginProvisioningResult } from "@tnvios/identity/first-login";

import { KeycloakSyncPersistence } from "../identity/keycloak-sync.persistence.js";
import { apiLogger } from "../logging/api-logger.js";

@Injectable()
export class ApiFirstLoginProvisioner {
  constructor(private readonly persistence: KeycloakSyncPersistence) {}

  async provision(principal: AuthenticatedPrincipal): Promise<FirstLoginProvisioningResult> {
    const result = await this.persistence.provisionFirstLogin({
      keycloakUserId: principal.keycloakUserId,
      ...(principal.email === undefined ? {} : { email: principal.email }),
      ...(principal.emailVerified === undefined ? {} : { emailVerified: principal.emailVerified }),
      ...(principal.preferredUsername === undefined
        ? {}
        : { preferredUsername: principal.preferredUsername }),
    });

    if (result.created) {
      apiLogger.info("First-login shadow user provisioned", {
        identityEventType: "identity.user.created",
        userId: result.userId,
      });
    }

    return result;
  }
}
