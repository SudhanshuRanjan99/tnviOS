import { Injectable } from "@nestjs/common";
import { KeycloakClient, createKeycloakConfiguration } from "@tnvios/auth";
import { validateEnvironment } from "@tnvios/config";

@Injectable()
export class ApiKeycloakClient {
  #client?: KeycloakClient;

  get client(): KeycloakClient {
    this.#client ??= new KeycloakClient(
      createKeycloakConfiguration(validateEnvironment(process.env)),
    );
    return this.#client;
  }
}
