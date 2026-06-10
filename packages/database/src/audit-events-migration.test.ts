import { describe, expect, it, vi } from "vitest";
import { Migration202606100004_create_audit_events } from "./migrations/Migration202606100004_create_audit_events.js";
describe("audit and events migration", () => {
  it("creates audit, outbox, registry, and idempotency storage", async () => {
    const migration = new Migration202606100004_create_audit_events(
      undefined as never,
      undefined as never,
    );
    const addSql = vi.spyOn(migration, "addSql");
    await migration.up();
    const sql = addSql.mock.calls.flat().join("\n");
    for (const table of ["audit_logs", "outbox_events", "event_registry", "consumer_receipts"])
      expect(sql).toContain(`create table "${table}"`);
    expect(sql).toContain('"consumer_receipts_event_consumer_unique"');
    expect(sql).toContain('"outbox_events_pending_index"');
  });
});
