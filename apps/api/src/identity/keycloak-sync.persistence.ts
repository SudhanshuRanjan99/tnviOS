import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { validateEnvironment } from "@tnvios/config";
import { closeMikroOrm, initializeMikroOrm, type TnviosMikroOrm } from "@tnvios/database";
import {
  FirstLoginProvisioner,
  KeycloakEventSynchronizer,
  User,
  UserSchema,
  type FirstLoginIdentity,
  type FirstLoginProvisioningResult,
  type KeycloakSyncEvent,
  type KeycloakSyncResult,
  type ShadowUserRepository,
} from "@tnvios/identity";

type ForkedEntityManager = ReturnType<TnviosMikroOrm["em"]["fork"]>;

@Injectable()
export class KeycloakSyncPersistence implements OnApplicationShutdown {
  #orm?: Promise<TnviosMikroOrm>;

  async provisionFirstLogin(identity: FirstLoginIdentity): Promise<FirstLoginProvisioningResult> {
    try {
      return await this.#provisionFirstLogin(identity);
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "UniqueConstraintViolationException") {
        throw error;
      }

      // A concurrent first request may have created the same Keycloak shadow user.
      return this.#provisionFirstLogin(identity);
    }
  }

  async #provisionFirstLogin(identity: FirstLoginIdentity): Promise<FirstLoginProvisioningResult> {
    const orm = await this.#getOrm();
    const entityManager = orm.em.fork();

    return entityManager.transactional((transactionalEntityManager) => {
      const provisioner = new FirstLoginProvisioner(
        new MikroOrmShadowUserRepository(transactionalEntityManager),
      );
      return provisioner.provision(identity);
    });
  }

  async synchronize(event: KeycloakSyncEvent): Promise<KeycloakSyncResult> {
    const orm = await this.#getOrm();
    const entityManager = orm.em.fork();

    return entityManager.transactional((transactionalEntityManager) => {
      const synchronizer = new KeycloakEventSynchronizer(
        new MikroOrmShadowUserRepository(transactionalEntityManager),
      );
      return synchronizer.synchronize(event);
    });
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.#orm !== undefined) {
      await closeMikroOrm(await this.#orm);
    }
  }

  #getOrm(): Promise<TnviosMikroOrm> {
    this.#orm ??= initializeMikroOrm({
      debug: false,
      entities: [UserSchema],
      environment: validateEnvironment(process.env),
    });
    return this.#orm;
  }
}

class MikroOrmShadowUserRepository implements ShadowUserRepository {
  constructor(private readonly entityManager: ForkedEntityManager) {}

  findByKeycloakUserId(keycloakUserId: string): Promise<User | null> {
    return this.entityManager.findOne(User, { keycloakUserId });
  }

  async save(user: User): Promise<void> {
    this.entityManager.persist(user);
    await this.entityManager.flush();
  }
}
