import { Migration } from "@mikro-orm/migrations";

const context =
  '"id" uuid not null, "tenant_id" uuid not null, "organization_id" uuid not null,';
const audit =
  '"created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by" uuid not null, "updated_by" uuid not null, "deleted_by" uuid null,';

export class Migration202606100010_create_crm extends Migration {
  override async up(): Promise<void> {
    this.addSql("create type \"crm_customer_status\" as enum ('prospect', 'active', 'inactive');");
    this.addSql("create type \"crm_lead_status\" as enum ('new', 'contacted', 'qualified', 'disqualified', 'converted');");
    this.addSql("create type \"crm_opportunity_stage\" as enum ('discovery', 'proposal', 'negotiation', 'won', 'lost');");
    this.addSql("create type \"crm_activity_type\" as enum ('call', 'email', 'meeting', 'task', 'note');");
    this.addSql("create type \"crm_activity_status\" as enum ('planned', 'completed', 'cancelled');");

    for (const [table, fields] of [
      ["crm_customers", '"name" text not null, "email" text null, "phone" text null, "website" text null, "industry" text null, "owner_user_id" uuid null, "status" "crm_customer_status" not null default \'prospect\','],
      ["crm_contacts", '"customer_id" uuid not null, "first_name" text not null, "last_name" text not null, "email" text null, "phone" text null, "job_title" text null, "primary" boolean not null default false,'],
      ["crm_leads", '"name" text not null, "company" text null, "email" text null, "phone" text null, "source" text null, "estimated_value" numeric(19,4) not null default 0, "assigned_to" uuid null, "status" "crm_lead_status" not null default \'new\', "converted_customer_id" uuid null,'],
      ["crm_opportunities", '"customer_id" uuid not null, "lead_id" uuid null, "name" text not null, "stage" "crm_opportunity_stage" not null default \'discovery\', "amount" numeric(19,4) not null, "probability" integer not null default 0, "expected_close_date" timestamptz null, "owner_user_id" uuid null, "closed_at" timestamptz null,'],
      ["crm_activities", '"subject" text not null, "type" "crm_activity_type" not null, "status" "crm_activity_status" not null default \'planned\', "entity_type" text not null, "entity_id" uuid not null, "assigned_to" uuid null, "due_at" timestamptz null, "completed_at" timestamptz null, "notes" text null,'],
    ] as const) {
      this.addSql(`create table "${table}" (${context} ${fields} ${audit} constraint "${table}_pkey" primary key ("id"));`);
      this.addSql(`create index "${table}_context_index" on "${table}" ("tenant_id", "organization_id");`);
      this.addSql(`alter table "${table}" add constraint "${table}_tenant_foreign" foreign key ("tenant_id") references "tenants" ("id");`);
      this.addSql(`alter table "${table}" add constraint "${table}_organization_foreign" foreign key ("organization_id") references "organizations" ("id");`);
    }
    for (const sql of [
      'alter table "crm_contacts" add constraint "crm_contacts_customer_foreign" foreign key ("customer_id") references "crm_customers" ("id");',
      'alter table "crm_leads" add constraint "crm_leads_converted_customer_foreign" foreign key ("converted_customer_id") references "crm_customers" ("id");',
      'alter table "crm_opportunities" add constraint "crm_opportunities_customer_foreign" foreign key ("customer_id") references "crm_customers" ("id");',
      'alter table "crm_opportunities" add constraint "crm_opportunities_lead_foreign" foreign key ("lead_id") references "crm_leads" ("id");',
      'alter table "crm_opportunities" add constraint "crm_opportunities_probability_check" check ("probability" between 0 and 100);',
      'alter table "crm_opportunities" add constraint "crm_opportunities_amount_check" check ("amount" >= 0);',
      'alter table "crm_leads" add constraint "crm_leads_estimated_value_check" check ("estimated_value" >= 0);',
    ]) this.addSql(sql);
    this.addSql('create index "crm_contacts_customer_index" on "crm_contacts" ("customer_id");');
    this.addSql('create index "crm_opportunities_pipeline_index" on "crm_opportunities" ("tenant_id", "organization_id", "stage", "expected_close_date");');
    this.addSql('create index "crm_activities_entity_index" on "crm_activities" ("tenant_id", "organization_id", "entity_type", "entity_id");');
  }

  override async down(): Promise<void> {
    for (const table of ["crm_activities", "crm_opportunities", "crm_leads", "crm_contacts", "crm_customers"])
      this.addSql(`drop table if exists "${table}" cascade;`);
    for (const type of ["crm_activity_status", "crm_activity_type", "crm_opportunity_stage", "crm_lead_status", "crm_customer_status"])
      this.addSql(`drop type if exists "${type}";`);
  }
}
