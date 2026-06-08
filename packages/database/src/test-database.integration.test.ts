import { describe, expect, it } from "vitest";

import { createMikroOrmTestDatabaseManager } from "./test-database.js";

const testDatabaseUrl = process.env.TNVIOS_TEST_DATABASE_URL;

describe.skipIf(testDatabaseUrl === undefined)("MikroOrmTestDatabaseOperations", () => {
  it("creates, queries, and drops an isolated PostgreSQL database", async () => {
    const manager = createMikroOrmTestDatabaseManager({
      baseDatabaseUrl: testDatabaseUrl ?? "",
      entities: [],
    });

    await manager.withDatabase(async ({ runtime }) => {
      const result = await runtime.em.execute<{ current_database: string }>(
        "select current_database() as current_database",
        [],
        "get",
      );
      const vectorExtension = await runtime.em.execute<{ installed: boolean }>(
        "select exists(select 1 from pg_extension where extname = 'vector') as installed",
        [],
        "get",
      );

      expect(result.current_database).toMatch(/^tnvios_test_/);
      expect(vectorExtension.installed).toBe(true);
    });
  }, 30_000);
});
