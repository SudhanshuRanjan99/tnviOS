import { Migration } from "@mikro-orm/migrations";

export class Migration202606100003_create_permission_engine extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "create type \"permission_scope_level\" as enum ('tenant', 'organization', 'business_unit', 'department', 'team', 'personal', 'record', 'field');",
    );
    this.addSql("create type \"policy_effect\" as enum ('allow', 'deny');");
    this.addSql("create type \"authorization_decision\" as enum ('allow', 'deny');");
    this.addSql(
      'create table "permissions" ("id" uuid not null, "code" text not null, "name" text not null, "description" text null, "module" text not null, "resource" text not null, "action" text not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "permissions_pkey" primary key ("id"), constraint "permissions_code_unique" unique ("code"));',
    );
    this.addSql(
      'create table "roles" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "name" text not null, "description" text null, "scope_level" "permission_scope_level" not null, "status" text not null default \'active\', "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by" uuid null, "updated_by" uuid null, "deleted_by" uuid null, constraint "roles_pkey" primary key ("id"), constraint "roles_organization_name_unique" unique ("organization_id", "name"));',
    );
    this.addSql(
      'create table "role_permissions" ("role_id" uuid not null, "permission_id" uuid not null, "created_at" timestamptz not null, "created_by" uuid null, constraint "role_permissions_pkey" primary key ("role_id", "permission_id"));',
    );
    this.addSql(
      'create table "user_roles" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "user_id" uuid not null, "role_id" uuid not null, "scope_level" "permission_scope_level" not null, "scope_id" uuid null, "created_at" timestamptz not null, "created_by" uuid null, "deleted_at" timestamptz null, "deleted_by" uuid null, constraint "user_roles_pkey" primary key ("id"));',
    );
    this.addSql(
      'create table "field_permissions" ("id" uuid not null, "role_id" uuid not null, "permission_code" text not null, "resource_type" text not null, "field_name" text not null, "effect" "policy_effect" not null default \'allow\', "created_at" timestamptz not null, constraint "field_permissions_pkey" primary key ("id"), constraint "field_permissions_unique" unique ("role_id", "permission_code", "resource_type", "field_name"));',
    );
    this.addSql(
      'create table "resource_permissions" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "user_id" uuid not null, "permission_code" text not null, "resource_type" text not null, "resource_id" uuid not null, "effect" "policy_effect" not null default \'allow\', "created_at" timestamptz not null, constraint "resource_permissions_pkey" primary key ("id"), constraint "resource_permissions_unique" unique ("user_id", "permission_code", "resource_type", "resource_id"));',
    );
    this.addSql(
      'create table "authorization_logs" ("id" uuid not null, "tenant_id" uuid null, "organization_id" uuid null, "user_id" uuid null, "permission_code" text null, "resource_type" text null, "resource_id" uuid null, "decision" "authorization_decision" not null, "reason" text not null, "context" jsonb not null default \'{}\', "created_at" timestamptz not null, constraint "authorization_logs_pkey" primary key ("id"));',
    );

    this.addSql(
      'alter table "roles" add constraint "roles_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");',
    );
    this.addSql(
      'alter table "roles" add constraint "roles_organization_id_foreign" foreign key ("organization_id") references "organizations" ("id");',
    );
    this.addSql(
      'alter table "role_permissions" add constraint "role_permissions_role_id_foreign" foreign key ("role_id") references "roles" ("id");',
    );
    this.addSql(
      'alter table "role_permissions" add constraint "role_permissions_permission_id_foreign" foreign key ("permission_id") references "permissions" ("id");',
    );
    this.addSql(
      'alter table "user_roles" add constraint "user_roles_user_id_foreign" foreign key ("user_id") references "users" ("id");',
    );
    this.addSql(
      'alter table "user_roles" add constraint "user_roles_role_id_foreign" foreign key ("role_id") references "roles" ("id");',
    );
    this.addSql(
      'alter table "field_permissions" add constraint "field_permissions_role_id_foreign" foreign key ("role_id") references "roles" ("id");',
    );
    this.addSql(
      'alter table "resource_permissions" add constraint "resource_permissions_user_id_foreign" foreign key ("user_id") references "users" ("id");',
    );

    this.addSql(
      'create index "user_roles_user_context_index" on "user_roles" ("user_id", "tenant_id", "organization_id");',
    );
    this.addSql(
      'create index "resource_permissions_lookup_index" on "resource_permissions" ("user_id", "resource_type", "resource_id");',
    );
    this.addSql(
      'create index "authorization_logs_context_index" on "authorization_logs" ("tenant_id", "organization_id", "created_at");',
    );
  }

  override async down(): Promise<void> {
    for (const table of [
      "authorization_logs",
      "resource_permissions",
      "field_permissions",
      "user_roles",
      "role_permissions",
      "roles",
      "permissions",
    ])
      this.addSql(`drop table if exists "${table}" cascade;`);
    this.addSql('drop type if exists "authorization_decision";');
    this.addSql('drop type if exists "policy_effect";');
    this.addSql('drop type if exists "permission_scope_level";');
  }
}
