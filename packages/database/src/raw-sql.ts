import type { QueryResult } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";

export interface RawSqlQuery {
  readonly parameters: readonly unknown[];
  readonly text: string;
}

export interface RawSqlMutationResult {
  readonly affectedRows: number;
}

export interface RawSqlDriver {
  all<Row extends object>(query: RawSqlQuery): Promise<readonly Row[]>;
  isInTransaction(): boolean;
  mutate(query: RawSqlQuery): Promise<RawSqlMutationResult>;
  one<Row extends object>(query: RawSqlQuery): Promise<Row | null>;
}

export class EmptyRawSqlQueryError extends Error {
  constructor() {
    super("Raw SQL query text must not be empty.");
    this.name = "EmptyRawSqlQueryError";
  }
}

export class RawSqlMutationOutsideTransactionError extends Error {
  constructor() {
    super("Raw SQL mutations must run inside TransactionManager.run().");
    this.name = "RawSqlMutationOutsideTransactionError";
  }
}

export function createRawSqlQuery(text: string, parameters: readonly unknown[] = []): RawSqlQuery {
  if (text.trim().length === 0) {
    throw new EmptyRawSqlQueryError();
  }

  return {
    parameters: [...parameters],
    text,
  };
}

export class MikroOrmRawSqlDriver implements RawSqlDriver {
  constructor(private readonly entityManager: EntityManager) {}

  all<Row extends object>(query: RawSqlQuery): Promise<readonly Row[]> {
    return this.entityManager.execute<Row[]>(query.text, [...query.parameters], "all");
  }

  isInTransaction(): boolean {
    return this.entityManager.isInTransaction();
  }

  async mutate(query: RawSqlQuery): Promise<RawSqlMutationResult> {
    const result = await this.entityManager.execute<QueryResult>(
      query.text,
      [...query.parameters],
      "run",
    );

    return {
      affectedRows: result.affectedRows,
    };
  }

  async one<Row extends object>(query: RawSqlQuery): Promise<Row | null> {
    const row = await this.entityManager.execute<Row>(query.text, [...query.parameters], "get");

    return row ?? null;
  }
}

export class RawSqlHelper {
  constructor(private readonly driver: RawSqlDriver) {}

  all<Row extends object>(query: RawSqlQuery): Promise<readonly Row[]> {
    return this.driver.all<Row>(query);
  }

  mutate(query: RawSqlQuery): Promise<RawSqlMutationResult> {
    if (!this.driver.isInTransaction()) {
      throw new RawSqlMutationOutsideTransactionError();
    }

    return this.driver.mutate(query);
  }

  one<Row extends object>(query: RawSqlQuery): Promise<Row | null> {
    return this.driver.one<Row>(query);
  }
}

export function createRawSqlHelper(entityManager: EntityManager): RawSqlHelper {
  return new RawSqlHelper(new MikroOrmRawSqlDriver(entityManager));
}
