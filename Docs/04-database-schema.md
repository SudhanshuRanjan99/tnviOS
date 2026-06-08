# Tnvios Database Schema Specification

## Purpose
This document defines the database architecture for Tnvios.

This is an implementation contract for AI coding agents.

## Database
PostgreSQL 17+

## ORM and Query Strategy
- MikroORM for transactional domain persistence.
- Raw SQL for complex reporting, analytics, bulk operations, recursive hierarchy queries, and permission-heavy reads.
- pgvector for embeddings and semantic retrieval.
- PostgreSQL full-text search as internal fallback.
- Typesense for user-facing indexed search.

## ID Standard
All primary IDs use UUID.

Recommended:
- UUIDv7 where supported by application utilities.
- No auto-increment IDs.

## Common Business Entity Fields

Most business tables must include:

```sql
id UUID PRIMARY KEY,
tenant_id UUID NOT NULL,
organization_id UUID NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at TIMESTAMPTZ NULL,
created_by UUID NULL,
updated_by UUID NULL,
deleted_by UUID NULL
```

## Hierarchy Fields

Use these where applicable:

```sql
business_unit_id UUID NULL,
department_id UUID NULL,
team_id UUID NULL
```

Do not blindly add all hierarchy fields to every table.

Examples:
- `users`: no tenant_id required.
- `tenants`: no tenant_id required.
- `organizations`: tenant_id required.
- `business_units`: tenant_id + organization_id required.
- `crm_customers`: tenant_id + organization_id required.
- `project_tasks`: tenant_id + organization_id + project_id required.

## Soft Delete Standard

Every deletable business table must include:
- deleted_at
- deleted_by

DELETE APIs perform soft delete only.

## Core Tables

### users

Tnvios shadow users linked to Keycloak.

```sql
id UUID PRIMARY KEY
keycloak_user_id TEXT UNIQUE NOT NULL
email TEXT UNIQUE NOT NULL
username TEXT NULL
status TEXT NOT NULL
email_verified BOOLEAN NOT NULL DEFAULT false
last_login_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
```

Indexes:
- unique keycloak_user_id
- unique email
- status

### user_profiles

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id)
first_name TEXT NULL
last_name TEXT NULL
phone TEXT NULL
avatar_file_id UUID NULL
timezone TEXT NULL
language TEXT NULL
preferences JSONB NOT NULL DEFAULT '{}'
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### tenants

```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
slug TEXT UNIQUE NOT NULL
status TEXT NOT NULL
subscription_plan TEXT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
```

### groups

Represents headquarters / parent group.

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL REFERENCES tenants(id)
name TEXT NOT NULL
legal_name TEXT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

### organizations

Legal entities.

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL REFERENCES tenants(id)
group_id UUID NULL REFERENCES groups(id)
name TEXT NOT NULL
legal_name TEXT NULL
registration_number TEXT NULL
tax_number_encrypted TEXT NULL
country TEXT NOT NULL
currency TEXT NOT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

### business_units

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL REFERENCES organizations(id)
parent_unit_id UUID NULL REFERENCES business_units(id)
name TEXT NOT NULL
code TEXT NOT NULL
description TEXT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

Unique:
- organization_id + code

### departments

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
business_unit_id UUID NOT NULL REFERENCES business_units(id)
name TEXT NOT NULL
code TEXT NOT NULL
head_user_id UUID NULL REFERENCES users(id)
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

### teams

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
department_id UUID NOT NULL REFERENCES departments(id)
name TEXT NOT NULL
team_lead_user_id UUID NULL REFERENCES users(id)
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

### memberships

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL REFERENCES organizations(id)
user_id UUID NOT NULL REFERENCES users(id)
business_unit_id UUID NULL REFERENCES business_units(id)
department_id UUID NULL REFERENCES departments(id)
team_id UUID NULL REFERENCES teams(id)
member_type TEXT NOT NULL
status TEXT NOT NULL
joined_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

Indexes:
- user_id
- tenant_id + organization_id
- organization_id + user_id
- status

## Permission Tables

### roles

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
name TEXT NOT NULL
description TEXT NULL
scope_level TEXT NOT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

Unique:
- organization_id + name

### permissions

```sql
id UUID PRIMARY KEY
code TEXT UNIQUE NOT NULL
name TEXT NOT NULL
description TEXT NULL
module TEXT NOT NULL
resource TEXT NOT NULL
action TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### role_permissions

```sql
role_id UUID NOT NULL REFERENCES roles(id)
permission_id UUID NOT NULL REFERENCES permissions(id)
created_at TIMESTAMPTZ NOT NULL
created_by UUID NULL
PRIMARY KEY(role_id, permission_id)
```

### user_roles

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
user_id UUID NOT NULL REFERENCES users(id)
role_id UUID NOT NULL REFERENCES roles(id)
scope_level TEXT NOT NULL
scope_id UUID NULL
created_at TIMESTAMPTZ NOT NULL
created_by UUID NULL
deleted_at TIMESTAMPTZ NULL
deleted_by UUID NULL
```

### policies

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
name TEXT NOT NULL
policy_type TEXT NOT NULL
description TEXT NULL
conditions JSONB NOT NULL
effect TEXT NOT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

### authorization_logs

```sql
id UUID PRIMARY KEY
tenant_id UUID NULL
organization_id UUID NULL
user_id UUID NULL
permission_code TEXT NULL
resource_type TEXT NULL
resource_id UUID NULL
decision TEXT NOT NULL
reason TEXT NOT NULL
context JSONB NOT NULL
ip_address TEXT NULL
user_agent TEXT NULL
created_at TIMESTAMPTZ NOT NULL
```

Partition monthly.

## Audit and Event Tables

### audit_logs

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NULL
user_id UUID NULL
entity_type TEXT NOT NULL
entity_id UUID NULL
action TEXT NOT NULL
old_values JSONB NULL
new_values JSONB NULL
metadata JSONB NOT NULL DEFAULT '{}'
ip_address TEXT NULL
user_agent TEXT NULL
correlation_id UUID NULL
created_at TIMESTAMPTZ NOT NULL
```

Partition monthly.

### outbox_events

```sql
id UUID PRIMARY KEY
tenant_id UUID NULL
organization_id UUID NULL
event_type TEXT NOT NULL
event_version INTEGER NOT NULL DEFAULT 1
aggregate_type TEXT NULL
aggregate_id UUID NULL
payload JSONB NOT NULL
headers JSONB NOT NULL DEFAULT '{}'
correlation_id UUID NULL
causation_id UUID NULL
status TEXT NOT NULL
attempts INTEGER NOT NULL DEFAULT 0
available_at TIMESTAMPTZ NOT NULL
published_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
```

Indexes:
- status + available_at
- event_type
- aggregate_type + aggregate_id
- tenant_id + organization_id

### events

Canonical event store.

```sql
id UUID PRIMARY KEY
tenant_id UUID NULL
organization_id UUID NULL
event_type TEXT NOT NULL
event_version INTEGER NOT NULL
aggregate_type TEXT NULL
aggregate_id UUID NULL
payload JSONB NOT NULL
headers JSONB NOT NULL
correlation_id UUID NULL
causation_id UUID NULL
occurred_at TIMESTAMPTZ NOT NULL
created_at TIMESTAMPTZ NOT NULL
```

## Workflow Tables

### workflows

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
name TEXT NOT NULL
description TEXT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

### workflow_versions

```sql
id UUID PRIMARY KEY
workflow_id UUID NOT NULL REFERENCES workflows(id)
version INTEGER NOT NULL
definition JSONB NOT NULL
status TEXT NOT NULL
published_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
created_by UUID NULL
```

### workflow_instances

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
workflow_id UUID NOT NULL REFERENCES workflows(id)
workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id)
entity_type TEXT NOT NULL
entity_id UUID NOT NULL
status TEXT NOT NULL
context JSONB NOT NULL
started_at TIMESTAMPTZ NOT NULL
completed_at TIMESTAMPTZ NULL
created_by UUID NULL
```

### workflow_tasks

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id)
assigned_to_user_id UUID NULL REFERENCES users(id)
assigned_to_role_id UUID NULL REFERENCES roles(id)
task_type TEXT NOT NULL
status TEXT NOT NULL
title TEXT NOT NULL
description TEXT NULL
due_at TIMESTAMPTZ NULL
completed_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
```

## Platform Service Tables

### notifications

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NULL
user_id UUID NOT NULL REFERENCES users(id)
title TEXT NOT NULL
message TEXT NOT NULL
channel TEXT NOT NULL
status TEXT NOT NULL
read_at TIMESTAMPTZ NULL
metadata JSONB NOT NULL DEFAULT '{}'
created_at TIMESTAMPTZ NOT NULL
```

### files

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
storage_provider TEXT NOT NULL
storage_key TEXT NOT NULL
file_name TEXT NOT NULL
mime_type TEXT NOT NULL
file_size BIGINT NOT NULL
checksum TEXT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
created_by UUID NULL
deleted_at TIMESTAMPTZ NULL
deleted_by UUID NULL
```

### activity_events

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
entity_type TEXT NOT NULL
entity_id UUID NOT NULL
activity_type TEXT NOT NULL
title TEXT NOT NULL
description TEXT NULL
actor_user_id UUID NULL
metadata JSONB NOT NULL DEFAULT '{}'
visibility JSONB NOT NULL DEFAULT '{}'
created_at TIMESTAMPTZ NOT NULL
```

### comment_threads

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
entity_type TEXT NOT NULL
entity_id UUID NOT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
created_by UUID NULL
```

### comments

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
thread_id UUID NOT NULL REFERENCES comment_threads(id)
parent_comment_id UUID NULL REFERENCES comments(id)
body JSONB NOT NULL
plain_text TEXT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

### comment_mentions

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
comment_id UUID NOT NULL REFERENCES comments(id)
mentioned_user_id UUID NOT NULL REFERENCES users(id)
created_at TIMESTAMPTZ NOT NULL
```

### onboarding_flows

```sql
id UUID PRIMARY KEY
tenant_id UUID NULL
organization_id UUID NULL
name TEXT NOT NULL
target_type TEXT NOT NULL
definition JSONB NOT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### onboarding_progress

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NULL
user_id UUID NOT NULL REFERENCES users(id)
flow_id UUID NOT NULL REFERENCES onboarding_flows(id)
status TEXT NOT NULL
current_step_key TEXT NULL
completed_steps JSONB NOT NULL DEFAULT '[]'
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### import_jobs

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
module TEXT NOT NULL
entity_type TEXT NOT NULL
file_id UUID NOT NULL REFERENCES files(id)
status TEXT NOT NULL
mapping JSONB NOT NULL
summary JSONB NOT NULL DEFAULT '{}'
created_at TIMESTAMPTZ NOT NULL
created_by UUID NULL
completed_at TIMESTAMPTZ NULL
```

### export_jobs

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
module TEXT NOT NULL
entity_type TEXT NOT NULL
status TEXT NOT NULL
filters JSONB NOT NULL DEFAULT '{}'
fields JSONB NOT NULL DEFAULT '[]'
result_file_id UUID NULL REFERENCES files(id)
created_at TIMESTAMPTZ NOT NULL
created_by UUID NULL
completed_at TIMESTAMPTZ NULL
```

### ai_conversations

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NULL
user_id UUID NOT NULL REFERENCES users(id)
title TEXT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### ai_messages

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NULL
conversation_id UUID NOT NULL REFERENCES ai_conversations(id)
role TEXT NOT NULL
content JSONB NOT NULL
tokens INTEGER NULL
created_at TIMESTAMPTZ NOT NULL
```

### ai_embeddings

Requires pgvector.

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NULL
entity_type TEXT NOT NULL
entity_id UUID NOT NULL
content_hash TEXT NOT NULL
content_text TEXT NOT NULL
embedding VECTOR
metadata JSONB NOT NULL DEFAULT '{}'
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

## Module Tables
Each module owns its business tables, but all must include tenant and audit fields.

Examples:

### crm_customers
```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
customer_code TEXT NOT NULL
type TEXT NOT NULL
name TEXT NOT NULL
email TEXT NULL
phone TEXT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

### projects
```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
organization_id UUID NOT NULL
customer_id UUID NULL
name TEXT NOT NULL
description TEXT NULL
status TEXT NOT NULL
start_date DATE NULL
end_date DATE NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
deleted_at TIMESTAMPTZ NULL
created_by UUID NULL
updated_by UUID NULL
deleted_by UUID NULL
```

## RLS Requirement
PostgreSQL Row-Level Security must be enabled for business tables.

Minimum rule:
```text
tenant_id must match current tenant context
```

Application-layer tenant checks are required, but database-layer isolation is also required.
