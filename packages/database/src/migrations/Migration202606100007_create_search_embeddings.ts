import { Migration } from "@mikro-orm/migrations";

export class Migration202606100007_create_search_embeddings extends Migration {
  override async up(): Promise<void> {
    this.addSql("create extension if not exists vector;");
    this.addSql("create type \"search_visibility\" as enum ('organization', 'restricted');");
    this.addSql(
      'create table "search_embeddings" ("id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null, "entity_type" text not null, "entity_id" uuid not null, "permission_code" text not null, "visibility" "search_visibility" not null default \'restricted\', "access_principals" text[] not null default \'{}\', "content" text not null, "content_hash" text not null, "metadata" jsonb not null default \'{}\', "embedding" vector not null, "embedding_dimensions" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "search_embeddings_pkey" primary key ("id"), constraint "search_embeddings_entity_unique" unique ("tenant_id", "organization_id", "entity_type", "entity_id"), constraint "search_embeddings_dimensions_check" check ("embedding_dimensions" > 0));',
    );
    this.addSql(
      'create index "search_embeddings_context_index" on "search_embeddings" ("tenant_id", "organization_id", "entity_type");',
    );
    this.addSql(
      'create index "search_embeddings_permission_index" on "search_embeddings" ("tenant_id", "organization_id", "permission_code");',
    );
    this.addSql(
      'create index "search_embeddings_access_principals_index" on "search_embeddings" using gin ("access_principals");',
    );
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "search_embeddings" cascade;');
    this.addSql('drop type if exists "search_visibility";');
  }
}
