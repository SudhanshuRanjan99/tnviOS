import { describe, expect, it, vi } from "vitest";

import { Migration202606100002_create_organization_engine } from "./migrations/Migration202606100002_create_organization_engine.js";

describe("organization engine migration", () => {
  it("creates the hierarchy, memberships, foreign keys, and isolation indexes", async () => {
    const migration = new Migration202606100002_create_organization_engine(
      undefined as never,
      undefined as never,
    );
    const addSql = vi.spyOn(migration, "addSql");
    await migration.up();
    const sql = addSql.mock.calls.flat().join("\n");

    for (const table of [
      "tenants",
      "groups",
      "organizations",
      "business_units",
      "departments",
      "teams",
      "memberships",
    ]) {
      expect(sql).toContain(`create table "${table}"`);
    }
    expect(sql).toContain('"memberships_organization_user_unique"');
    expect(sql).toContain('"memberships_tenant_organization_index"');
    expect(sql).toContain('"business_units_organization_id_foreign"');
    expect(sql).toContain('"memberships_user_id_foreign"');
  });
});
