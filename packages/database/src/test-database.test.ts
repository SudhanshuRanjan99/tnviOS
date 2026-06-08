import { describe, expect, it } from "vitest";

import {
  assertTestDatabaseName,
  createDatabaseUrl,
  createTestDatabaseName,
  InvalidTestDatabaseNameError,
  TestDatabaseManager,
  type TestDatabaseOperations,
} from "./test-database.js";

interface FakeRuntime {
  readonly databaseUrl: string;
}

class FakeTestDatabaseOperations implements TestDatabaseOperations<FakeRuntime> {
  readonly calls: string[] = [];
  failClose = false;
  failMigration = false;

  async close(runtime: FakeRuntime): Promise<void> {
    this.calls.push(`close:${runtime.databaseUrl}`);

    if (this.failClose) {
      throw new Error("close failed");
    }
  }

  async create(databaseName: string): Promise<void> {
    this.calls.push(`create:${databaseName}`);
  }

  async drop(databaseName: string): Promise<void> {
    this.calls.push(`drop:${databaseName}`);
  }

  async initialize(databaseUrl: string): Promise<FakeRuntime> {
    this.calls.push(`initialize:${databaseUrl}`);
    return { databaseUrl };
  }

  async migrate(): Promise<void> {
    this.calls.push("migrate");

    if (this.failMigration) {
      throw new Error("migration failed");
    }
  }
}

const baseDatabaseUrl = "postgresql://tnvios:secret@localhost:5432/tnvios?sslmode=disable";
const databaseName = "tnvios_test_example";

describe("test database identifiers", () => {
  it("generates safe, unique test database names", () => {
    const first = createTestDatabaseName();
    const second = createTestDatabaseName();

    expect(first).not.toBe(second);
    expect(() => assertTestDatabaseName(first)).not.toThrow();
  });

  it("rejects names outside the dedicated test namespace", () => {
    expect(() => assertTestDatabaseName("tnvios")).toThrowError(InvalidTestDatabaseNameError);
    expect(() => assertTestDatabaseName('tnvios_test_bad"name')).toThrowError(
      InvalidTestDatabaseNameError,
    );
  });

  it("creates an isolated URL while preserving connection options", () => {
    expect(createDatabaseUrl(baseDatabaseUrl, databaseName)).toBe(
      "postgresql://tnvios:secret@localhost:5432/tnvios_test_example?sslmode=disable",
    );
  });
});

describe("TestDatabaseManager", () => {
  it("creates, initializes, and migrates an isolated database", async () => {
    const operations = new FakeTestDatabaseOperations();
    const manager = new TestDatabaseManager(baseDatabaseUrl, operations);

    const database = await manager.create({ databaseName });

    expect(database.databaseName).toBe(databaseName);
    expect(operations.calls).toEqual([
      `create:${databaseName}`,
      `initialize:${database.databaseUrl}`,
      "migrate",
    ]);
  });

  it("can skip migrations for schema-specific tests", async () => {
    const operations = new FakeTestDatabaseOperations();
    const manager = new TestDatabaseManager(baseDatabaseUrl, operations);

    await manager.create({ databaseName, runMigrations: false });

    expect(operations.calls).not.toContain("migrate");
  });

  it("closes the runtime and drops the database exactly once", async () => {
    const operations = new FakeTestDatabaseOperations();
    const manager = new TestDatabaseManager(baseDatabaseUrl, operations);
    const database = await manager.create({ databaseName });

    await database.close();
    await database.close();

    expect(operations.calls.filter((call) => call.startsWith("close:"))).toHaveLength(1);
    expect(operations.calls.filter((call) => call.startsWith("drop:"))).toHaveLength(1);
  });

  it("cleans up when initialization or migrations fail", async () => {
    const operations = new FakeTestDatabaseOperations();
    operations.failMigration = true;
    const manager = new TestDatabaseManager(baseDatabaseUrl, operations);

    await expect(manager.create({ databaseName })).rejects.toThrowError("migration failed");

    expect(operations.calls.some((call) => call.startsWith("close:"))).toBe(true);
    expect(operations.calls).toContain(`drop:${databaseName}`);
  });

  it("attempts to drop the database when closing its runtime fails", async () => {
    const operations = new FakeTestDatabaseOperations();
    const manager = new TestDatabaseManager(baseDatabaseUrl, operations);
    const database = await manager.create({ databaseName });
    operations.failClose = true;

    await expect(database.close()).rejects.toThrowError("close failed");

    expect(operations.calls).toContain(`drop:${databaseName}`);
  });

  it("guarantees cleanup around a test callback", async () => {
    const operations = new FakeTestDatabaseOperations();
    const manager = new TestDatabaseManager(baseDatabaseUrl, operations);

    await manager.withDatabase(
      (database) => {
        expect(database.databaseName).toBe(databaseName);
      },
      { databaseName },
    );

    expect(operations.calls.at(-1)).toBe(`drop:${databaseName}`);
  });
});
