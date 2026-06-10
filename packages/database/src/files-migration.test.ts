import { describe, expect, it, vi } from "vitest";

import { Migration202606100006_create_files } from "./migrations/Migration202606100006_create_files.js";

describe("files migration", () => {
  it("creates file metadata and explicit record grants", async () => {
    const migration = new Migration202606100006_create_files(
      undefined as never,
      undefined as never,
    );
    const addSql = vi.spyOn(migration, "addSql");
    await migration.up();
    const sql = addSql.mock.calls.flat().join("\n");
    expect(sql).toContain('create table "files"');
    expect(sql).toContain('create table "file_permissions"');
    expect(sql).toContain('"file_permissions_file_entity_unique"');
    expect(sql).toContain('"files_storage_key_unique"');
  });
});
