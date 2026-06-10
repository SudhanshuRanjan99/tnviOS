import { Migration } from "@mikro-orm/migrations";

export class Migration202606100004_create_audit_events extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "create type \"outbox_status\" as enum ('pending', 'publishing', 'published', 'failed');",
    );
    this.addSql(
      'create table "audit_logs" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid null, "user_id" uuid null, "entity_type" text not null, "entity_id" uuid null, "action" text not null, "old_values" jsonb null, "new_values" jsonb null, "metadata" jsonb not null default \'{}\', "correlation_id" uuid null, "created_at" timestamptz not null, constraint "audit_logs_pkey" primary key ("id"));',
    );
    this.addSql(
      'create table "outbox_events" ("id" uuid not null, "tenant_id" uuid null, "organization_id" uuid null, "event_type" text not null, "event_version" integer not null default 1, "source" text not null, "user_id" uuid null, "aggregate_type" text null, "aggregate_id" uuid null, "payload" jsonb not null, "headers" jsonb not null default \'{}\', "correlation_id" uuid null, "causation_id" uuid null, "status" "outbox_status" not null default \'pending\', "attempts" integer not null default 0, "available_at" timestamptz not null, "published_at" timestamptz null, "created_at" timestamptz not null, constraint "outbox_events_pkey" primary key ("id"));',
    );
    this.addSql(
      'create table "event_registry" ("id" uuid not null, "event_type" text not null, "version" integer not null, "publisher" text not null, "consumers" jsonb not null default \'[]\', "schema" jsonb not null default \'{}\', "description" text null, "created_at" timestamptz not null, constraint "event_registry_pkey" primary key ("id"), constraint "event_registry_type_version_unique" unique ("event_type", "version"));',
    );
    this.addSql(
      'create table "consumer_receipts" ("id" uuid not null, "event_id" uuid not null, "consumer_name" text not null, "processed_at" timestamptz not null, constraint "consumer_receipts_pkey" primary key ("id"), constraint "consumer_receipts_event_consumer_unique" unique ("event_id", "consumer_name"));',
    );
    this.addSql(
      'create index "audit_logs_context_index" on "audit_logs" ("tenant_id", "organization_id", "created_at");',
    );
    this.addSql(
      'create index "outbox_events_pending_index" on "outbox_events" ("status", "available_at");',
    );
    this.addSql('create index "outbox_events_type_index" on "outbox_events" ("event_type");');
    this.addSql(
      'create index "outbox_events_aggregate_index" on "outbox_events" ("aggregate_type", "aggregate_id");',
    );
    this.addSql(
      'create index "outbox_events_context_index" on "outbox_events" ("tenant_id", "organization_id");',
    );
  }
  override async down(): Promise<void> {
    this.addSql('drop table if exists "consumer_receipts" cascade;');
    this.addSql('drop table if exists "event_registry" cascade;');
    this.addSql('drop table if exists "outbox_events" cascade;');
    this.addSql('drop table if exists "audit_logs" cascade;');
    this.addSql('drop type if exists "outbox_status";');
  }
}
