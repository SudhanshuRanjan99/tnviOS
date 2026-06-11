import { Migration } from "@mikro-orm/migrations";

const context = '"id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null,';
const audit =
  '"created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null,';

export class Migration202606100009_create_shared_enterprise_services extends Migration {
  override async up(): Promise<void> {
    for (const [table, fields] of [
      [
        "onboarding_flows",
        '"flow_key" text not null, "audience" text not null, "definition" jsonb not null, "active" boolean not null default true,',
      ],
      [
        "onboarding_progress",
        '"flow_id" uuid not null, "user_id" uuid not null, "status" text not null default \'active\', "completed_steps" jsonb not null default \'[]\', "completed_at" timestamptz null,',
      ],
      [
        "help_articles",
        '"article_key" text not null, "title" text not null, "body" text not null, "required_permission" text null, "active" boolean not null default true,',
      ],
      [
        "help_contexts",
        '"article_id" uuid not null, "module" text not null, "page" text null, "role_key" text null, "entity_type" text null, "workflow_state" text null,',
      ],
      [
        "activity_events",
        '"entity_type" text not null, "entity_id" uuid not null, "activity_type" text not null, "title" text not null, "actor_user_id" uuid null, "visibility_principals" jsonb not null, "metadata" jsonb not null default \'{}\',',
      ],
      [
        "comment_threads",
        '"entity_type" text not null, "entity_id" uuid not null, "status" text not null default \'open\',',
      ],
      [
        "comments",
        '"thread_id" uuid not null, "parent_comment_id" uuid null, "body" text not null, "deleted_at" timestamptz null,',
      ],
      ["comment_mentions", '"comment_id" uuid not null, "user_id" uuid not null,'],
      [
        "import_templates",
        '"template_key" text not null, "module" text not null, "entity_type" text not null, "definition" jsonb not null,',
      ],
      [
        "import_jobs",
        '"template_id" uuid not null, "file_id" uuid not null, "status" text not null default \'pending\', "summary" jsonb not null default \'{}\',',
      ],
      [
        "import_job_rows",
        '"import_job_id" uuid not null, "row_number" integer not null, "status" text not null, "values" jsonb not null, "errors" jsonb not null default \'[]\',',
      ],
      [
        "export_templates",
        '"template_key" text not null, "module" text not null, "entity_type" text not null, "definition" jsonb not null,',
      ],
      [
        "export_jobs",
        '"template_id" uuid not null, "status" text not null default \'pending\', "fields" jsonb not null, "file_id" uuid null,',
      ],
      [
        "inbound_email_messages",
        '"provider_message_id" text not null, "sender" text not null, "recipient" text not null, "subject" text not null, "body" text not null, "status" text not null default \'received\', "metadata" jsonb not null default \'{}\',',
      ],
      [
        "inbound_email_actions",
        '"message_id" uuid not null, "action_type" text not null, "status" text not null, "result" jsonb not null default \'{}\',',
      ],
    ] as const) {
      this.addSql(
        `create table "${table}" (${context} ${fields} ${audit} constraint "${table}_pkey" primary key ("id"));`,
      );
      this.addSql(
        `create index "${table}_context_index" on "${table}" ("tenant_id", "organization_id");`,
      );
    }
    for (const sql of [
      'alter table "onboarding_progress" add constraint "onboarding_progress_flow_foreign" foreign key ("flow_id") references "onboarding_flows" ("id") on delete cascade;',
      'alter table "help_contexts" add constraint "help_contexts_article_foreign" foreign key ("article_id") references "help_articles" ("id") on delete cascade;',
      'alter table "comments" add constraint "comments_thread_foreign" foreign key ("thread_id") references "comment_threads" ("id") on delete cascade;',
      'alter table "comment_mentions" add constraint "comment_mentions_comment_foreign" foreign key ("comment_id") references "comments" ("id") on delete cascade;',
      'alter table "import_jobs" add constraint "import_jobs_template_foreign" foreign key ("template_id") references "import_templates" ("id");',
      'alter table "import_job_rows" add constraint "import_job_rows_job_foreign" foreign key ("import_job_id") references "import_jobs" ("id") on delete cascade;',
      'alter table "export_jobs" add constraint "export_jobs_template_foreign" foreign key ("template_id") references "export_templates" ("id");',
      'alter table "inbound_email_actions" add constraint "inbound_email_actions_message_foreign" foreign key ("message_id") references "inbound_email_messages" ("id") on delete cascade;',
    ])
      this.addSql(sql);
    this.addSql(
      'create unique index "onboarding_flows_key_unique" on "onboarding_flows" ("tenant_id", "organization_id", "flow_key");',
    );
    this.addSql(
      'create unique index "help_articles_key_unique" on "help_articles" ("tenant_id", "organization_id", "article_key");',
    );
    this.addSql(
      'create index "activity_events_entity_index" on "activity_events" ("tenant_id", "organization_id", "entity_type", "entity_id", "created_at");',
    );
    this.addSql(
      'create unique index "comment_mentions_unique" on "comment_mentions" ("comment_id", "user_id");',
    );
    this.addSql(
      'create unique index "inbound_email_provider_message_unique" on "inbound_email_messages" ("tenant_id", "provider_message_id");',
    );
  }

  override async down(): Promise<void> {
    for (const table of [
      "inbound_email_actions",
      "inbound_email_messages",
      "export_jobs",
      "export_templates",
      "import_job_rows",
      "import_jobs",
      "import_templates",
      "comment_mentions",
      "comments",
      "comment_threads",
      "activity_events",
      "help_contexts",
      "help_articles",
      "onboarding_progress",
      "onboarding_flows",
    ])
      this.addSql(`drop table if exists "${table}" cascade;`);
  }
}
