import { randomUUID } from "node:crypto";

import type { Options } from "@mikro-orm/postgresql";

import { closeMikroOrm, initializeMikroOrm, type TnviosMikroOrm } from "./mikro-orm.js";

const MAX_POSTGRES_IDENTIFIER_LENGTH = 63;
const TEST_DATABASE_NAME_PATTERN = /^tnvios_test_[a-z0-9_]+$/;
const POSTGRES_IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]*$/;

export interface TestDatabaseOperations<Runtime> {
  close(runtime: Runtime): Promise<void>;
  create(databaseName: string): Promise<void>;
  drop(databaseName: string): Promise<void>;
  initialize(databaseUrl: string): Promise<Runtime>;
  migrate(runtime: Runtime): Promise<void>;
}

export interface CreateTestDatabaseOptions {
  readonly databaseName?: string;
  readonly runMigrations?: boolean;
}

export class InvalidTestDatabaseNameError extends Error {
  constructor() {
    super('Test database names must match "tnvios_test_[a-z0-9_]+" and be at most 63 characters.');
    this.name = "InvalidTestDatabaseNameError";
  }
}

export class InvalidPostgresIdentifierError extends Error {
  constructor() {
    super("PostgreSQL identifiers must contain only lowercase letters, numbers, and underscores.");
    this.name = "InvalidPostgresIdentifierError";
  }
}

export function createTestDatabaseName(): string {
  return `tnvios_test_${randomUUID().replaceAll("-", "")}`;
}

export function assertTestDatabaseName(databaseName: string): void {
  if (
    databaseName.length > MAX_POSTGRES_IDENTIFIER_LENGTH ||
    !TEST_DATABASE_NAME_PATTERN.test(databaseName)
  ) {
    throw new InvalidTestDatabaseNameError();
  }
}

export function createDatabaseUrl(baseDatabaseUrl: string, databaseName: string): string {
  assertTestDatabaseName(databaseName);

  const url = new URL(baseDatabaseUrl);
  url.pathname = `/${databaseName}`;

  return url.toString();
}

export class TestDatabaseHandle<Runtime> {
  #closed = false;

  constructor(
    readonly databaseName: string,
    readonly databaseUrl: string,
    readonly runtime: Runtime,
    private readonly operations: TestDatabaseOperations<Runtime>,
  ) {}

  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }

    try {
      await this.operations.close(this.runtime);
    } finally {
      await this.operations.drop(this.databaseName);
      this.#closed = true;
    }
  }
}

export class TestDatabaseManager<Runtime> {
  constructor(
    private readonly baseDatabaseUrl: string,
    private readonly operations: TestDatabaseOperations<Runtime>,
  ) {}

  async create(options: CreateTestDatabaseOptions = {}): Promise<TestDatabaseHandle<Runtime>> {
    const databaseName = options.databaseName ?? createTestDatabaseName();
    const databaseUrl = createDatabaseUrl(this.baseDatabaseUrl, databaseName);
    let runtime: Runtime | undefined;

    await this.operations.create(databaseName);

    try {
      runtime = await this.operations.initialize(databaseUrl);

      if (options.runMigrations ?? true) {
        await this.operations.migrate(runtime);
      }

      return new TestDatabaseHandle(databaseName, databaseUrl, runtime, this.operations);
    } catch (error) {
      try {
        if (runtime !== undefined) {
          await this.operations.close(runtime);
        }
      } finally {
        await this.operations.drop(databaseName);
      }

      throw error;
    }
  }

  async withDatabase<Result>(
    work: (database: TestDatabaseHandle<Runtime>) => Result | Promise<Result>,
    options: CreateTestDatabaseOptions = {},
  ): Promise<Result> {
    const database = await this.create(options);

    try {
      return await work(database);
    } finally {
      await database.close();
    }
  }
}

export interface MikroOrmTestDatabaseOptions {
  readonly baseDatabaseUrl: string;
  readonly entities: NonNullable<Options["entities"]>;
  readonly extensions?: readonly string[];
}

export class MikroOrmTestDatabaseOperations implements TestDatabaseOperations<TnviosMikroOrm> {
  readonly #extensions: readonly string[];

  constructor(private readonly options: MikroOrmTestDatabaseOptions) {
    this.#extensions = options.extensions ?? ["vector"];

    for (const extension of this.#extensions) {
      assertPostgresIdentifier(extension);
    }
  }

  close(runtime: TnviosMikroOrm): Promise<void> {
    return closeMikroOrm(runtime);
  }

  async create(databaseName: string): Promise<void> {
    assertTestDatabaseName(databaseName);
    await this.executeAdminSql(`create database "${databaseName}"`);
  }

  async drop(databaseName: string): Promise<void> {
    assertTestDatabaseName(databaseName);
    await this.executeAdminSql(`drop database if exists "${databaseName}" with (force)`);
  }

  async initialize(databaseUrl: string): Promise<TnviosMikroOrm> {
    const orm = await initializeMikroOrm({
      debug: false,
      entities: this.options.entities,
      environment: {
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
      },
      pool: {
        max: 2,
        min: 0,
      },
    });

    try {
      for (const extension of this.#extensions) {
        await orm.em.execute(`create extension if not exists "${extension}"`);
      }
    } catch (error) {
      await closeMikroOrm(orm);
      throw error;
    }

    return orm;
  }

  async migrate(runtime: TnviosMikroOrm): Promise<void> {
    await runtime.migrator.up();
  }

  private async executeAdminSql(sql: string): Promise<void> {
    const adminOrm = await initializeMikroOrm({
      debug: false,
      entities: [],
      environment: {
        DATABASE_URL: createAdminDatabaseUrl(this.options.baseDatabaseUrl),
        NODE_ENV: "test",
      },
      pool: {
        max: 1,
        min: 0,
      },
    });

    try {
      await adminOrm.em.execute(sql);
    } finally {
      await closeMikroOrm(adminOrm);
    }
  }
}

export function createMikroOrmTestDatabaseManager(
  options: MikroOrmTestDatabaseOptions,
): TestDatabaseManager<TnviosMikroOrm> {
  return new TestDatabaseManager(
    options.baseDatabaseUrl,
    new MikroOrmTestDatabaseOperations(options),
  );
}

function createAdminDatabaseUrl(baseDatabaseUrl: string): string {
  const url = new URL(baseDatabaseUrl);
  url.pathname = "/postgres";

  return url.toString();
}

function assertPostgresIdentifier(identifier: string): void {
  if (
    identifier.length > MAX_POSTGRES_IDENTIFIER_LENGTH ||
    !POSTGRES_IDENTIFIER_PATTERN.test(identifier)
  ) {
    throw new InvalidPostgresIdentifierError();
  }
}
