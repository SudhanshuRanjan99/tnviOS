import { Injectable } from "@nestjs/common";
import { KeycloakJwtValidator, type AuthenticatedPrincipal } from "@tnvios/auth";

import { ApiKeycloakClient } from "./keycloak-client.provider.js";

@Injectable()
export class ApiJwtValidator {
  #validator?: KeycloakJwtValidator;

  constructor(private readonly keycloakClient: ApiKeycloakClient) {}

  validate(accessToken: string): Promise<AuthenticatedPrincipal> {
    this.#validator ??= new KeycloakJwtValidator(this.keycloakClient.client);
    return this.#validator.validate(accessToken);
  }
}
