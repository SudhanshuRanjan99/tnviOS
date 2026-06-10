import { describe, expect, it, vi } from "vitest";
import { Migration202606100003_create_permission_engine } from "./migrations/Migration202606100003_create_permission_engine.js";

describe("permission engine migration", () => {
  it("creates RBAC, field, record, and authorization log tables", async () => {
    const migration = new Migration202606100003_create_permission_engine(
      undefined as never,
      undefined as never,
    );
    const addSql = vi.spyOn(migration, "addSql");
    await migration.up();
    const sql = addSql.mock.calls.flat().join("\n");
    for (const table of [
      "permissions",
      "roles",
      "role_permissions",
      "user_roles",
      "field_permissions",
      "resource_permissions",
      "authorization_logs",
    ])
      expect(sql).toContain(`create table "${table}"`);
    expect(sql).toContain('"user_roles_user_context_index"');
    expect(sql).toContain('"authorization_logs_context_index"');
  });
});
