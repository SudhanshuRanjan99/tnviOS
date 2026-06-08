import { describe, expect, it } from "vitest";

import { createMigrationFileName, createMikroOrmOptions } from "./mikro-orm.js";

const databaseUrl = "postgresql://tnvios:secret@localhost:5432/tnvios";

describe("createMikroOrmOptions", () => {
  it("creates production-safe PostgreSQL options", () => {
    const options = createMikroOrmOptions({
      environment: {
        DATABASE_URL: databaseUrl,
        NODE_ENV: "production",
      },
      entities: [],
    });

    expect(options).toMatchObject({
      allowGlobalContext: false,
      clientUrl: databaseUrl,
      debug: false,
      ensureDatabase: false,
      entities: [],
      forceUtcTimezone: true,
      schema: "public",
    });
  });

  it("enables debug logging by default only in development", () => {
    const options = createMikroOrmOptions({
      environment: {
        DATABASE_URL: databaseUrl,
        NODE_ENV: "development",
      },
      entities: [],
    });

    expect(options.debug).toBe(true);
  });

  it("allows explicit pool sizing and debug overrides", () => {
    const options = createMikroOrmOptions({
      environment: {
        DATABASE_URL: databaseUrl,
        NODE_ENV: "development",
      },
      entities: [],
      debug: false,
      pool: {
        min: 2,
        max: 20,
      },
    });

    expect(options.debug).toBe(false);
    expect(options.pool).toEqual({ min: 2, max: 20 });
  });

  it("uses deterministic package-owned migration paths", () => {
    const options = createMikroOrmOptions({
      environment: {
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
      },
      entities: [],
    });

    expect(options.migrations?.path).toMatch(/packages[\\/]database[\\/]src[\\/]migrations$/);
    expect(options.migrations?.pathTs).toMatch(/packages[\\/]database[\\/]src[\\/]migrations$/);
  });

  it("creates deterministic migration class names", () => {
    expect(createMigrationFileName("202606080001", "create users table")).toBe(
      "Migration202606080001_create_users_table",
    );
  });
});
