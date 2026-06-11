import { Migration } from "@mikro-orm/migrations";

export class Migration202606100008_create_workflow_engine extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "create type \"workflow_definition_status\" as enum ('draft', 'active', 'archived');",
    );
    this.addSql(
      "create type \"workflow_version_status\" as enum ('draft', 'published', 'retired');",
    );
    this.addSql(
      "create type \"workflow_instance_status\" as enum ('running', 'waiting', 'completed', 'cancelled', 'failed', 'escalated');",
    );
    this.addSql("create type \"workflow_task_type\" as enum ('approval', 'task');");
    this.addSql(
      "create type \"workflow_task_status\" as enum ('pending', 'in_progress', 'approved', 'rejected', 'completed', 'cancelled', 'escalated');",
    );
    this.addSql("create type \"workflow_approval_decision\" as enum ('approved', 'rejected');");
    this.addSql(
      'create table "workflows" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "name" text not null, "description" text null, "module" text not null, "status" "workflow_definition_status" not null default \'draft\', "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by" uuid not null, "updated_by" uuid not null, "deleted_by" uuid null, constraint "workflows_pkey" primary key ("id"), constraint "workflows_organization_name_unique" unique ("organization_id", "name"));',
    );
    this.addSql(
      'create table "workflow_versions" ("id" uuid not null, "workflow_id" uuid not null, "version" integer not null, "definition" jsonb not null, "status" "workflow_version_status" not null default \'draft\', "published_at" timestamptz null, "created_at" timestamptz not null, "created_by" uuid not null, constraint "workflow_versions_pkey" primary key ("id"), constraint "workflow_versions_workflow_version_unique" unique ("workflow_id", "version"));',
    );
    this.addSql(
      'create table "workflow_instances" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "workflow_id" uuid not null, "workflow_version_id" uuid not null, "entity_type" text not null, "entity_id" uuid not null, "status" "workflow_instance_status" not null default \'running\', "context" jsonb not null default \'{}\', "requester_user_id" uuid not null, "started_at" timestamptz not null, "completed_at" timestamptz null, "created_by" uuid not null, constraint "workflow_instances_pkey" primary key ("id"));',
    );
    this.addSql(
      'create table "workflow_tasks" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "workflow_instance_id" uuid not null, "node_key" text not null, "assigned_to_user_id" uuid null, "assigned_to_role_id" uuid null, "task_type" "workflow_task_type" not null, "status" "workflow_task_status" not null default \'pending\', "title" text not null, "description" text null, "due_at" timestamptz null, "completed_at" timestamptz null, "created_at" timestamptz not null, constraint "workflow_tasks_pkey" primary key ("id"), constraint "workflow_tasks_assignee_check" check ("assigned_to_user_id" is not null or "assigned_to_role_id" is not null));',
    );
    this.addSql(
      'create table "workflow_approvals" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "workflow_instance_id" uuid not null, "workflow_task_id" uuid not null, "decision" "workflow_approval_decision" not null, "decided_by" uuid not null, "comment" text null, "decided_at" timestamptz not null, constraint "workflow_approvals_pkey" primary key ("id"), constraint "workflow_approvals_task_unique" unique ("workflow_task_id"));',
    );
    this.addSql(
      'create table "workflow_events" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "workflow_instance_id" uuid not null, "event_type" text not null, "payload" jsonb not null default \'{}\', "created_at" timestamptz not null, constraint "workflow_events_pkey" primary key ("id"));',
    );
    this.addSql(
      'create table "workflow_audit_logs" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "workflow_instance_id" uuid not null, "workflow_task_id" uuid null, "actor_user_id" uuid not null, "action" text not null, "old_status" text null, "new_status" text null, "metadata" jsonb not null default \'{}\', "created_at" timestamptz not null, constraint "workflow_audit_logs_pkey" primary key ("id"));',
    );
    for (const sql of [
      'alter table "workflow_versions" add constraint "workflow_versions_workflow_id_foreign" foreign key ("workflow_id") references "workflows" ("id");',
      'alter table "workflow_instances" add constraint "workflow_instances_workflow_id_foreign" foreign key ("workflow_id") references "workflows" ("id");',
      'alter table "workflow_instances" add constraint "workflow_instances_version_id_foreign" foreign key ("workflow_version_id") references "workflow_versions" ("id");',
      'alter table "workflow_tasks" add constraint "workflow_tasks_instance_id_foreign" foreign key ("workflow_instance_id") references "workflow_instances" ("id");',
      'alter table "workflow_approvals" add constraint "workflow_approvals_task_id_foreign" foreign key ("workflow_task_id") references "workflow_tasks" ("id");',
      'alter table "workflow_events" add constraint "workflow_events_instance_id_foreign" foreign key ("workflow_instance_id") references "workflow_instances" ("id");',
      'alter table "workflow_audit_logs" add constraint "workflow_audit_logs_instance_id_foreign" foreign key ("workflow_instance_id") references "workflow_instances" ("id");',
      'alter table "workflows" add constraint "workflows_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");',
      'alter table "workflows" add constraint "workflows_organization_id_foreign" foreign key ("organization_id") references "organizations" ("id");',
      'alter table "workflow_instances" add constraint "workflow_instances_requester_id_foreign" foreign key ("requester_user_id") references "users" ("id");',
      'alter table "workflow_tasks" add constraint "workflow_tasks_assigned_user_id_foreign" foreign key ("assigned_to_user_id") references "users" ("id");',
      'alter table "workflow_tasks" add constraint "workflow_tasks_assigned_role_id_foreign" foreign key ("assigned_to_role_id") references "roles" ("id");',
      'alter table "workflow_approvals" add constraint "workflow_approvals_decided_by_foreign" foreign key ("decided_by") references "users" ("id");',
    ])
      this.addSql(sql);
    this.addSql(
      'create index "workflow_instances_entity_index" on "workflow_instances" ("tenant_id", "organization_id", "entity_type", "entity_id");',
    );
    this.addSql(
      'create index "workflow_tasks_assignee_index" on "workflow_tasks" ("tenant_id", "organization_id", "assigned_to_user_id", "status");',
    );
    this.addSql(
      'create index "workflow_events_instance_index" on "workflow_events" ("workflow_instance_id", "created_at");',
    );
    this.addSql(
      'create index "workflow_audit_logs_instance_index" on "workflow_audit_logs" ("workflow_instance_id", "created_at");',
    );
  }

  override async down(): Promise<void> {
    for (const table of [
      "workflow_audit_logs",
      "workflow_events",
      "workflow_approvals",
      "workflow_tasks",
      "workflow_instances",
      "workflow_versions",
      "workflows",
    ]) {
      this.addSql(`drop table if exists "${table}" cascade;`);
    }
    for (const type of [
      "workflow_approval_decision",
      "workflow_task_status",
      "workflow_task_type",
      "workflow_instance_status",
      "workflow_version_status",
      "workflow_definition_status",
    ]) {
      this.addSql(`drop type if exists "${type}";`);
    }
  }
}
