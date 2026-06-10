import { Migration } from "@mikro-orm/migrations";

export class Migration202606100006_create_files extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "create type \"file_status\" as enum ('pending', 'uploaded', 'scanning', 'available', 'rejected', 'deleted');",
    );
    this.addSql("create type \"file_access_level\" as enum ('read', 'manage');");
    this.addSql(
      'create table "files" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "storage_provider" text not null, "storage_key" text not null, "file_name" text not null, "mime_type" text not null, "file_size" bigint not null, "checksum" text null, "status" "file_status" not null default \'pending\', "created_at" timestamptz not null, "created_by" uuid not null, "deleted_at" timestamptz null, "deleted_by" uuid null, constraint "files_pkey" primary key ("id"), constraint "files_storage_key_unique" unique ("storage_key"));',
    );
    this.addSql(
      'create table "file_permissions" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "file_id" uuid not null, "entity_type" text not null, "entity_id" uuid not null, "access_level" "file_access_level" not null default \'read\', "created_at" timestamptz not null, "created_by" uuid not null, constraint "file_permissions_pkey" primary key ("id"), constraint "file_permissions_file_entity_unique" unique ("file_id", "entity_type", "entity_id"));',
    );
    this.addSql(
      'create index "files_context_index" on "files" ("tenant_id", "organization_id", "created_at");',
    );
    this.addSql('create index "files_status_index" on "files" ("status");');
    this.addSql('create index "file_permissions_file_index" on "file_permissions" ("file_id");');
    this.addSql(
      'create index "file_permissions_entity_index" on "file_permissions" ("entity_type", "entity_id");',
    );
    this.addSql(
      'alter table "files" add constraint "files_created_by_foreign" foreign key ("created_by") references "users" ("id") on update cascade;',
    );
    this.addSql(
      'alter table "file_permissions" add constraint "file_permissions_file_id_foreign" foreign key ("file_id") references "files" ("id") on update cascade on delete cascade;',
    );
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "file_permissions" cascade;');
    this.addSql('drop table if exists "files" cascade;');
    this.addSql('drop type if exists "file_access_level";');
    this.addSql('drop type if exists "file_status";');
  }
}
