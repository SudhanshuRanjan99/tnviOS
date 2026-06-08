import { Migration } from "@mikro-orm/migrations";
import { describe, expect, it } from "vitest";

import {
  DuplicateMigrationError,
  MigrationRegistry,
  MigrationRunner,
  UnsafeMigrationRollbackError,
} from "./migrations.js";

class ExampleMigration extends Migration {
  override async up(): Promise<void> {}
}

describe("MigrationRegistry", () => {
  it("registers migrations with ownership metadata", () => {
    const registry = new MigrationRegistry();

    registry.register({
      name: "Migration202606080001_example",
      owner: "platform",
      version: "1.0.0",
      migration: ExampleMigration,
    });

    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0]?.owner).toBe("platform");
  });

  it("rejects duplicate migration names", () => {
    const registry = new MigrationRegistry();
    const migration = {
      name: "Migration202606080001_example",
      owner: "platform",
      version: "1.0.0",
      migration: ExampleMigration,
    };

    registry.register(migration);

    expect(() => registry.register(migration)).toThrowError(DuplicateMigrationError);
  });
});

describe("MigrationRunner", () => {
  it("denies production rollback without explicit authorization", async () => {
    const runner = new MigrationRunner({
      environment: {
        DATABASE_URL: "postgresql://localhost/tnvios",
        NODE_ENV: "production",
        TNVIOS_ENV: "production",
      },
      entities: [],
    });

    await expect(runner.down("Migration202606080001_example")).rejects.toThrowError(
      UnsafeMigrationRollbackError,
    );
  });
});
