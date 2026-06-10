import { describe, expect, it, vi } from "vitest";

import { Migration202606100005_create_jobs_notifications } from "./migrations/Migration202606100005_create_jobs_notifications.js";

describe("jobs and notifications migration", () => {
  it("creates notifications, templates, and delivery logs", async () => {
    const migration = new Migration202606100005_create_jobs_notifications(
      undefined as never,
      undefined as never,
    );
    const addSql = vi.spyOn(migration, "addSql");
    await migration.up();
    const sql = addSql.mock.calls.flat().join("\n");
    for (const table of ["notifications", "notification_templates", "notification_deliveries"]) {
      expect(sql).toContain(`create table "${table}"`);
    }
    expect(sql).toContain('"notifications_inbox_index"');
    expect(sql).toContain('"notification_deliveries_notification_id_foreign"');
  });
});
