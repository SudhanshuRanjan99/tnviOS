import { Migration } from "@mikro-orm/migrations";

export class Migration202606100001_create_users extends Migration {
  override async up(): Promise<void> {
    this.addSql("create type \"user_status\" as enum ('pending', 'active', 'disabled');");
    this.addSql(
      'create table "users" ("id" uuid not null, "keycloak_user_id" text not null, "email" text not null, "username" text null, "status" "user_status" not null default \'pending\', "email_verified" boolean not null default false, "last_login_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, constraint "users_pkey" primary key ("id"));',
    );
    this.addSql(
      'alter table "users" add constraint "users_keycloak_user_id_unique" unique ("keycloak_user_id");',
    );
    this.addSql('alter table "users" add constraint "users_email_unique" unique ("email");');
    this.addSql('create index "users_status_index" on "users" ("status");');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "users" cascade;');
    this.addSql('drop type if exists "user_status";');
  }
}
