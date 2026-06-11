import { describe, expect, it, vi } from "vitest";

import { Migration202606100009_create_shared_enterprise_services } from "./migrations/Migration202606100009_create_shared_enterprise_services.js";

describe("shared enterprise services migration", () => {
  it("creates onboarding, help, collaboration, exchange, and inbound email storage", async () => {
    const migration = new Migration202606100009_create_shared_enterprise_services(
      undefined as never,
      undefined as never,
    );
    const addSql = vi.spyOn(migration, "addSql");
    await migration.up();
    const sql = addSql.mock.calls.flat().join("\n");
    for (const table of [
      "onboarding_flows",
      "help_articles",
      "activity_events",
      "comments",
      "comment_mentions",
      "import_jobs",
      "export_jobs",
      "inbound_email_messages",
    ])
      expect(sql).toContain(`create table "${table}"`);
    expect(sql).toContain('"inbound_email_provider_message_unique"');
    expect(sql).toContain('"activity_events_entity_index"');
  });
});
