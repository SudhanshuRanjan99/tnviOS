import { describe, expect, it, vi } from "vitest";

import { Migration202606100008_create_workflow_engine } from "./migrations/Migration202606100008_create_workflow_engine.js";

describe("workflow migration", () => {
  it("creates centralized workflow, approval, event, and audit storage", async () => {
    const migration = new Migration202606100008_create_workflow_engine(
      undefined as never,
      undefined as never,
    );
    const addSql = vi.spyOn(migration, "addSql");
    await migration.up();
    const sql = addSql.mock.calls.flat().join("\n");
    for (const table of [
      "workflows",
      "workflow_versions",
      "workflow_instances",
      "workflow_tasks",
      "workflow_approvals",
      "workflow_events",
      "workflow_audit_logs",
    ]) {
      expect(sql).toContain(`create table "${table}"`);
    }
    expect(sql).toContain('"workflow_tasks_assignee_check"');
    expect(sql).toContain('"workflow_approvals_task_unique"');
  });
});
