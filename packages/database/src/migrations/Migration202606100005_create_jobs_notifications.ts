import { Migration } from "@mikro-orm/migrations";

export class Migration202606100005_create_jobs_notifications extends Migration {
  override async up(): Promise<void> {
    this.addSql("create type \"notification_channel\" as enum ('in-app', 'email');");
    this.addSql(
      "create type \"notification_status\" as enum ('queued', 'sent', 'failed', 'read');",
    );
    this.addSql(
      "create type \"notification_delivery_status\" as enum ('pending', 'sent', 'failed');",
    );
    this.addSql(
      'create table "notifications" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid null, "user_id" uuid not null, "template_key" text null, "title" text not null, "message" text not null, "channel" "notification_channel" not null, "status" "notification_status" not null, "recipient" text null, "read_at" timestamptz null, "metadata" jsonb not null default \'{}\', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "notifications_pkey" primary key ("id"));',
    );
    this.addSql(
      'create table "notification_templates" ("id" uuid not null, "tenant_id" uuid null, "key" text not null, "channel" "notification_channel" not null, "subject" text not null, "body" text not null, "active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "notification_templates_pkey" primary key ("id"), constraint "notification_templates_tenant_key_channel_unique" unique ("tenant_id", "key", "channel"));',
    );
    this.addSql(
      'create table "notification_deliveries" ("id" uuid not null, "notification_id" uuid not null, "provider" text not null, "status" "notification_delivery_status" not null default \'pending\', "provider_message_id" text null, "error" text null, "attempts" integer not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "notification_deliveries_pkey" primary key ("id"));',
    );
    this.addSql(
      'create index "notifications_inbox_index" on "notifications" ("tenant_id", "user_id", "channel", "created_at");',
    );
    this.addSql(
      'create index "notifications_organization_index" on "notifications" ("organization_id");',
    );
    this.addSql(
      'create index "notification_deliveries_notification_index" on "notification_deliveries" ("notification_id");',
    );
    this.addSql(
      'alter table "notifications" add constraint "notifications_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;',
    );
    this.addSql(
      'alter table "notification_deliveries" add constraint "notification_deliveries_notification_id_foreign" foreign key ("notification_id") references "notifications" ("id") on update cascade on delete cascade;',
    );
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "notification_deliveries" cascade;');
    this.addSql('drop table if exists "notification_templates" cascade;');
    this.addSql('drop table if exists "notifications" cascade;');
    this.addSql('drop type if exists "notification_delivery_status";');
    this.addSql('drop type if exists "notification_status";');
    this.addSql('drop type if exists "notification_channel";');
  }
}
