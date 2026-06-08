import type { Environment } from "@tnvios/config";
import type { Migration } from "@mikro-orm/migrations";

import { closeMikroOrm, initializeMikroOrm, type MikroOrmSetupOptions } from "./mikro-orm.js";

export interface RegisteredMigration {
  readonly name: string;
  readonly owner: string;
  readonly version: string;
  readonly migration: typeof Migration;
}

export interface MigrationStatus {
  readonly executed: readonly string[];
  readonly pending: readonly string[];
}

export class DuplicateMigrationError extends Error {
  constructor(name: string) {
    super(`Migration "${name}" is already registered`);
    this.name = "DuplicateMigrationError";
  }
}

export class UnsafeMigrationRollbackError extends Error {
  constructor() {
    super("Production migration rollback requires explicit authorization");
    this.name = "UnsafeMigrationRollbackError";
  }
}

export class MigrationRegistry {
  readonly #migrations = new Map<string, RegisteredMigration>();

  register(migration: RegisteredMigration): void {
    if (this.#migrations.has(migration.name)) {
      throw new DuplicateMigrationError(migration.name);
    }

    this.#migrations.set(migration.name, migration);
  }

  list(): readonly RegisteredMigration[] {
    return [...this.#migrations.values()];
  }
}

export interface MigrationRunnerOptions extends MikroOrmSetupOptions {
  readonly environment: Pick<Environment, "DATABASE_URL" | "NODE_ENV" | "TNVIOS_ENV">;
}

export class MigrationRunner {
  constructor(private readonly options: MigrationRunnerOptions) {}

  async status(): Promise<MigrationStatus> {
    const orm = await initializeMikroOrm(this.options);

    try {
      const migrator = orm.migrator;
      const [executed, pending] = await Promise.all([
        migrator.getExecuted(),
        migrator.getPending(),
      ]);

      return {
        executed: executed.map((migration) => migration.name),
        pending: pending.map((migration) => migration.name),
      };
    } finally {
      await closeMikroOrm(orm);
    }
  }

  async up(): Promise<readonly string[]> {
    const orm = await initializeMikroOrm(this.options);

    try {
      return (await orm.migrator.up()).map((migration) => migration.name);
    } finally {
      await closeMikroOrm(orm);
    }
  }

  async down(migrationName: string, explicitlyAuthorized = false): Promise<readonly string[]> {
    if (this.options.environment.TNVIOS_ENV === "production" && !explicitlyAuthorized) {
      throw new UnsafeMigrationRollbackError();
    }

    const orm = await initializeMikroOrm(this.options);

    try {
      return (await orm.migrator.down({ migrations: [migrationName] })).map(
        (migration) => migration.name,
      );
    } finally {
      await closeMikroOrm(orm);
    }
  }
}
