import { describe, expect, it, vi } from "vitest";

import { Migration202606100010_create_crm } from "./migrations/Migration202606100010_create_crm.js";

describe("CRM migration", () => {
  it("creates tenant-aware sales management storage and constraints", async () => {
    const migration = new Migration202606100010_create_crm(undefined as never, undefined as never);
    const addSql = vi.spyOn(migration, "addSql");
    await migration.up();
    const sql = addSql.mock.calls.flat().join("\n");
    for (const table of ["crm_customers", "crm_contacts", "crm_leads", "crm_opportunities", "crm_activities"])
      expect(sql).toContain(`create table "${table}"`);
    expect(sql).toContain('"crm_opportunities_probability_check"');
    expect(sql).toContain('"crm_opportunities_pipeline_index"');
  });
});
