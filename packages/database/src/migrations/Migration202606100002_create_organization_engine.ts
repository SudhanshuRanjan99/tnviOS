import { Migration } from "@mikro-orm/migrations";

export class Migration202606100002_create_organization_engine extends Migration {
  override async up(): Promise<void> {
    this.addSql("create type \"organization_status\" as enum ('active', 'inactive');");
    this.addSql(
      "create type \"member_type\" as enum ('employee', 'contractor', 'consultant', 'intern', 'executive');",
    );
    this.addSql(
      'create table "tenants" ("id" uuid not null, "name" text not null, "slug" text not null, "status" "organization_status" not null default \'active\', "subscription_plan" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by" uuid null, "updated_by" uuid null, "deleted_by" uuid null, constraint "tenants_pkey" primary key ("id"), constraint "tenants_slug_unique" unique ("slug"));',
    );
    this.addSql(
      'create table "groups" ("id" uuid not null, "tenant_id" uuid not null, "name" text not null, "legal_name" text null, "status" "organization_status" not null default \'active\', "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by" uuid null, "updated_by" uuid null, "deleted_by" uuid null, constraint "groups_pkey" primary key ("id"));',
    );
    this.addSql(
      'create table "organizations" ("id" uuid not null, "tenant_id" uuid not null, "group_id" uuid null, "name" text not null, "legal_name" text null, "registration_number" text null, "country" text not null, "currency" text not null, "status" "organization_status" not null default \'active\', "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by" uuid null, "updated_by" uuid null, "deleted_by" uuid null, constraint "organizations_pkey" primary key ("id"));',
    );
    this.addSql(
      'create table "business_units" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "parent_unit_id" uuid null, "name" text not null, "code" text not null, "description" text null, "status" "organization_status" not null default \'active\', "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by" uuid null, "updated_by" uuid null, "deleted_by" uuid null, constraint "business_units_pkey" primary key ("id"), constraint "business_units_organization_code_unique" unique ("organization_id", "code"));',
    );
    this.addSql(
      'create table "departments" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "business_unit_id" uuid not null, "name" text not null, "code" text not null, "head_user_id" uuid null, "status" "organization_status" not null default \'active\', "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by" uuid null, "updated_by" uuid null, "deleted_by" uuid null, constraint "departments_pkey" primary key ("id"), constraint "departments_organization_code_unique" unique ("organization_id", "code"));',
    );
    this.addSql(
      'create table "teams" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "department_id" uuid not null, "name" text not null, "team_lead_user_id" uuid null, "status" "organization_status" not null default \'active\', "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by" uuid null, "updated_by" uuid null, "deleted_by" uuid null, constraint "teams_pkey" primary key ("id"));',
    );
    this.addSql(
      'create table "memberships" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "user_id" uuid not null, "business_unit_id" uuid null, "department_id" uuid null, "team_id" uuid null, "member_type" "member_type" not null, "status" "organization_status" not null default \'active\', "joined_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by" uuid null, "updated_by" uuid null, "deleted_by" uuid null, constraint "memberships_pkey" primary key ("id"), constraint "memberships_organization_user_unique" unique ("organization_id", "user_id"));',
    );

    this.addSql(
      'alter table "groups" add constraint "groups_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");',
    );
    this.addSql(
      'alter table "organizations" add constraint "organizations_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");',
    );
    this.addSql(
      'alter table "organizations" add constraint "organizations_group_id_foreign" foreign key ("group_id") references "groups" ("id");',
    );
    this.addSql(
      'alter table "business_units" add constraint "business_units_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");',
    );
    this.addSql(
      'alter table "business_units" add constraint "business_units_organization_id_foreign" foreign key ("organization_id") references "organizations" ("id");',
    );
    this.addSql(
      'alter table "business_units" add constraint "business_units_parent_unit_id_foreign" foreign key ("parent_unit_id") references "business_units" ("id");',
    );
    this.addSql(
      'alter table "departments" add constraint "departments_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");',
    );
    this.addSql(
      'alter table "departments" add constraint "departments_organization_id_foreign" foreign key ("organization_id") references "organizations" ("id");',
    );
    this.addSql(
      'alter table "departments" add constraint "departments_business_unit_id_foreign" foreign key ("business_unit_id") references "business_units" ("id");',
    );
    this.addSql(
      'alter table "departments" add constraint "departments_head_user_id_foreign" foreign key ("head_user_id") references "users" ("id");',
    );
    this.addSql(
      'alter table "teams" add constraint "teams_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");',
    );
    this.addSql(
      'alter table "teams" add constraint "teams_organization_id_foreign" foreign key ("organization_id") references "organizations" ("id");',
    );
    this.addSql(
      'alter table "teams" add constraint "teams_department_id_foreign" foreign key ("department_id") references "departments" ("id");',
    );
    this.addSql(
      'alter table "teams" add constraint "teams_team_lead_user_id_foreign" foreign key ("team_lead_user_id") references "users" ("id");',
    );
    this.addSql(
      'alter table "memberships" add constraint "memberships_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");',
    );
    this.addSql(
      'alter table "memberships" add constraint "memberships_organization_id_foreign" foreign key ("organization_id") references "organizations" ("id");',
    );
    this.addSql(
      'alter table "memberships" add constraint "memberships_user_id_foreign" foreign key ("user_id") references "users" ("id");',
    );
    this.addSql(
      'alter table "memberships" add constraint "memberships_business_unit_id_foreign" foreign key ("business_unit_id") references "business_units" ("id");',
    );
    this.addSql(
      'alter table "memberships" add constraint "memberships_department_id_foreign" foreign key ("department_id") references "departments" ("id");',
    );
    this.addSql(
      'alter table "memberships" add constraint "memberships_team_id_foreign" foreign key ("team_id") references "teams" ("id");',
    );

    this.addSql('create index "groups_tenant_id_index" on "groups" ("tenant_id");');
    this.addSql('create index "organizations_tenant_id_index" on "organizations" ("tenant_id");');
    this.addSql(
      'create index "business_units_tenant_organization_index" on "business_units" ("tenant_id", "organization_id");',
    );
    this.addSql(
      'create index "departments_tenant_organization_index" on "departments" ("tenant_id", "organization_id");',
    );
    this.addSql(
      'create index "teams_tenant_organization_index" on "teams" ("tenant_id", "organization_id");',
    );
    this.addSql('create index "memberships_user_id_index" on "memberships" ("user_id");');
    this.addSql(
      'create index "memberships_tenant_organization_index" on "memberships" ("tenant_id", "organization_id");',
    );
    this.addSql('create index "memberships_status_index" on "memberships" ("status");');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "memberships" cascade;');
    this.addSql('drop table if exists "teams" cascade;');
    this.addSql('drop table if exists "departments" cascade;');
    this.addSql('drop table if exists "business_units" cascade;');
    this.addSql('drop table if exists "organizations" cascade;');
    this.addSql('drop table if exists "groups" cascade;');
    this.addSql('drop table if exists "tenants" cascade;');
    this.addSql('drop type if exists "member_type";');
    this.addSql('drop type if exists "organization_status";');
  }
}
