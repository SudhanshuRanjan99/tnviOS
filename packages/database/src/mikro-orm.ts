import { fileURLToPath } from "node:url";

import type { Environment } from "@tnvios/config";
import { Migrator } from "@mikro-orm/migrations";
import { defineConfig, MikroORM, type Options } from "@mikro-orm/postgresql";

import { DEFAULT_DATABASE_SCHEMA } from "./constants.js";

const compiledMigrationsPath = fileURLToPath(new URL("./migrations", import.meta.url));
const sourceMigrationsPath = fileURLToPath(new URL("../src/migrations", import.meta.url));

export interface MikroOrmSetupOptions {
  readonly environment: Pick<Environment, "DATABASE_URL" | "NODE_ENV">;
  readonly entities: NonNullable<Options["entities"]>;
  readonly debug?: boolean;
  readonly pool?: {
    readonly min?: number;
    readonly max?: number;
  };
}

export type TnviosMikroOrmOptions = ReturnType<typeof defineConfig>;

export function createMigrationFileName(timestamp: string, name?: string): string {
  const normalizedName = name
    ?.trim()
    .replaceAll(/[^a-zA-Z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");

  return normalizedName ? `Migration${timestamp}_${normalizedName}` : `Migration${timestamp}`;
}

export function createMikroOrmOptions({
  environment,
  entities,
  debug,
  pool,
}: MikroOrmSetupOptions): TnviosMikroOrmOptions {
  return defineConfig({
    allowGlobalContext: false,
    clientUrl: environment.DATABASE_URL,
    debug: debug ?? environment.NODE_ENV === "development",
    discovery: {
      warnWhenNoEntities: false,
    },
    ensureDatabase: false,
    entities: [...entities],
    extensions: [Migrator],
    forceUtcTimezone: true,
    migrations: {
      allOrNothing: true,
      disableForeignKeys: false,
      emit: "ts",
      fileName: createMigrationFileName,
      path: compiledMigrationsPath,
      pathTs: sourceMigrationsPath,
      safe: true,
      snapshot: false,
      tableName: "tnvios_migrations",
      transactional: true,
    },
    pool: {
      max: pool?.max ?? 10,
      min: pool?.min ?? 1,
    },
    schema: DEFAULT_DATABASE_SCHEMA,
  });
}

export async function initializeMikroOrm(options: MikroOrmSetupOptions) {
  return MikroORM.init(createMikroOrmOptions(options));
}

export type TnviosMikroOrm = Awaited<ReturnType<typeof initializeMikroOrm>>;

export async function closeMikroOrm(orm: TnviosMikroOrm): Promise<void> {
  await orm.close(true);
}
