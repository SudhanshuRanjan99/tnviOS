import { describe, expect, it, vi } from "vitest";

import { Migration202606100007_create_search_embeddings } from "./migrations/Migration202606100007_create_search_embeddings.js";

describe("search migration", () => {
  it("creates permission-aware pgvector embedding storage", async () => {
    const migration = new Migration202606100007_create_search_embeddings(
      undefined as never,
      undefined as never,
    );
    const addSql = vi.spyOn(migration, "addSql");
    await migration.up();
    const sql = addSql.mock.calls.flat().join("\n");
    expect(sql).toContain("create extension if not exists vector");
    expect(sql).toContain('create table "search_embeddings"');
    expect(sql).toContain('"embedding" vector');
    expect(sql).toContain('"search_embeddings_access_principals_index"');
  });
});
