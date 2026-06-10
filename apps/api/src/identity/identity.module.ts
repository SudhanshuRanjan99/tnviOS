import { Module } from "@nestjs/common";

import { KeycloakSyncPersistence } from "./keycloak-sync.persistence.js";
import { KeycloakWebhookController } from "./keycloak-webhook.controller.js";
import { KeycloakWebhookVerifier } from "./keycloak-webhook-verifier.js";

@Module({
  controllers: [KeycloakWebhookController],
  exports: [KeycloakSyncPersistence],
  providers: [
    KeycloakSyncPersistence,
    {
      provide: KeycloakWebhookVerifier,
      useFactory: () => new KeycloakWebhookVerifier(),
    },
  ],
})
export class IdentityModule {}
