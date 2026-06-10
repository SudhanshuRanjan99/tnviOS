import type { UserId } from "@tnvios/database/contracts";

import type { ShadowUserRepository } from "./keycloak-sync.js";
import { User, type UserStatus } from "./user.entity.js";

export interface FirstLoginIdentity {
  readonly email?: string;
  readonly emailVerified?: boolean;
  readonly keycloakUserId: string;
  readonly preferredUsername?: string;
}

export interface FirstLoginProvisioningResult {
  readonly created: boolean;
  readonly status: UserStatus;
  readonly userId: UserId;
}

export class FirstLoginEmailRequiredError extends Error {
  constructor() {
    super("A verified identity email is required to provision a shadow user.");
    this.name = "FirstLoginEmailRequiredError";
  }
}

export class FirstLoginProvisioner {
  constructor(private readonly users: ShadowUserRepository) {}

  async provision(identity: FirstLoginIdentity): Promise<FirstLoginProvisioningResult> {
    let user = await this.users.findByKeycloakUserId(identity.keycloakUserId);
    const created = user === null;

    if (user === null) {
      if (identity.email === undefined) {
        throw new FirstLoginEmailRequiredError();
      }

      user = new User({
        email: identity.email,
        emailVerified: identity.emailVerified,
        keycloakUserId: identity.keycloakUserId,
        username: identity.preferredUsername,
      });
    } else if (identity.email !== undefined) {
      user.synchronizeIdentity({
        email: identity.email,
        emailVerified: identity.emailVerified ?? user.emailVerified,
        username: identity.preferredUsername ?? user.username,
      });
    }

    await this.users.save(user);

    return {
      created,
      status: user.status,
      userId: user.id,
    };
  }
}
