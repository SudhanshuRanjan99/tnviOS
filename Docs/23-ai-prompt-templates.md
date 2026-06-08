# Tnvios AI Prompt Templates

## Purpose
Use these prompts when asking AI coding agents to build Tnvios.

## General Build Prompt

```text
Read these docs first:
- docs/00-master-context.md
- docs/01-tech-stack.md
- docs/02-monorepo-structure.md
- docs/03-ai-coding-rules.md

Build only the requested feature.
Do not invent dependencies.
Do not change folder structure.
Do not skip tenant validation.
Do not skip permission checks.
Do not skip audit logs.
Do not skip outbox events for mutations.
Add tests.
Output complete files and list changed files.
```

## Backend Feature Prompt

```text
Read:
- docs/00-master-context.md
- docs/03-ai-coding-rules.md
- docs/04-database-schema.md
- docs/05-api-contracts.md
- docs/07-permission-policy-rules.md
- docs/08-event-catalog.md

Build the backend for: [FEATURE NAME]

Requirements:
- NestJS
- MikroORM
- TransactionManager for mutations
- Zod DTO validation where applicable
- permission check
- tenant/org validation
- audit log for mutation
- outbox event for business event
- Vitest tests
- no controller business logic
```

## Database Migration Prompt

```text
Read:
- docs/04-database-schema.md
- docs/03-ai-coding-rules.md

Create database entities and migration for: [TABLES]

Requirements:
- PostgreSQL 17+
- MikroORM entities
- UUID primary keys
- tenant_id and organization_id where required
- created_at/updated_at/deleted_at
- created_by/updated_by/deleted_by
- indexes
- foreign keys
- no production schema sync
- explain migration impact
```

## API Contract Prompt

```text
Read:
- docs/05-api-contracts.md
- docs/07-permission-policy-rules.md

Create API endpoints for: [RESOURCE]

For each endpoint include:
- method
- path
- request DTO
- response DTO
- permission
- audit action
- event emitted
- tests
```

## UI Feature Prompt

```text
Read:
- docs/10-ui-design-system.md
- docs/11-platform-form-engine.md
- docs/03-ai-coding-rules.md

Build UI for: [FEATURE]

Requirements:
- Next.js
- TypeScript
- import components from @tnvios/ui
- use Tnvios Platform Form Engine for forms
- use Zod validation
- no direct raw shadcn imports
- no custom duplicate UI primitives
- permission-aware actions
- loading, empty, error states
```

## Module Prompt

```text
Read:
- docs/12-module-sdk.md
- docs/02-monorepo-structure.md
- docs/03-ai-coding-rules.md

Build module: [MODULE NAME]

Include:
- manifest
- permissions
- events
- backend routes
- services
- repositories
- frontend navigation
- forms
- tables
- tests
- import/export template if needed
- search registration if needed
```

## AI Feature Prompt

```text
Read:
- docs/13-ai-architecture.md
- docs/07-permission-policy-rules.md
- docs/03-ai-coding-rules.md

Build AI feature: [FEATURE]

Requirements:
- use Vercel AI SDK
- tools call Tnvios services
- permission checks
- tenant/org filtering
- AI audit logs
- no direct database writes from AI tool
- no unauthorized retrieval
- tests for denied permission
```

## Review Prompt

```text
Review this code against:
- docs/03-ai-coding-rules.md
- docs/07-permission-policy-rules.md
- docs/15-jobs-events-outbox.md

Find:
- missing tenant checks
- missing permission checks
- missing audit logs
- missing outbox events
- wrong transaction boundaries
- direct module coupling
- direct provider usage
- use of any
- missing tests

Be strict. Do not praise. Return only issues and fixes.
```
