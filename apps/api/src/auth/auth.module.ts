import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { IdentityModule } from "../identity/identity.module.js";
import { AuthenticationGuard } from "./authentication.guard.js";
import { ApiFirstLoginProvisioner } from "./first-login.provider.js";
import { ApiJwtValidator } from "./jwt-validator.provider.js";
import { ApiKeycloakClient } from "./keycloak-client.provider.js";

@Module({
  imports: [IdentityModule],
  exports: [ApiJwtValidator, ApiKeycloakClient],
  providers: [
    ApiFirstLoginProvisioner,
    ApiJwtValidator,
    ApiKeycloakClient,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
})
export class AuthModule {}
