import { describe, expect, it, vi } from "vitest";

import { Migration202606100001_create_users } from "./migrations/Migration202606100001_create_users.js";

describe("user shadow table migration", () => {
  it("creates the documented users table constraints and indexes", async () => {
    const migration = new Migration202606100001_create_users(
      undefined as never,
      undefined as never,
    );
    const addSql = vi.spyOn(migration, "addSql");

    await migration.up();

    const sql = addSql.mock.calls.flat().join("\n");
    expect(sql).toContain('create table "users"');
    expect(sql).toContain('"keycloak_user_id" text not null');
    expect(sql).toContain('"email" text not null');
    expect(sql).toContain('"status" "user_status" not null default \'pending\'');
    expect(sql).toContain('"email_verified" boolean not null default false');
    expect(sql).toContain('"deleted_at" timestamptz null');
    expect(sql).toContain('"users_keycloak_user_id_unique"');
    expect(sql).toContain('"users_email_unique"');
    expect(sql).toContain('"users_status_index"');
  });
});
