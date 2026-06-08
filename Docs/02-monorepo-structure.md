# Tnvios Monorepo Structure

## Purpose
This document defines the required repository structure for Tnvios.

AI agents must not invent alternate folder structures.

## Root Structure

```text
tnvios/
├── apps/
│   ├── api/
│   ├── web/
│   └── admin/
│
├── packages/
│   ├── config/
│   ├── database/
│   ├── auth/
│   ├── identity/
│   ├── organization/
│   ├── permissions/
│   ├── policies/
│   ├── events/
│   ├── jobs/
│   ├── workflow/
│   ├── audit/
│   ├── notifications/
│   ├── files/
│   ├── search/
│   ├── analytics/
│   ├── ai/
│   ├── forms/
│   ├── ui/
│   ├── onboarding/
│   ├── help/
│   ├── activity/
│   ├── comments/
│   ├── inbound-email/
│   ├── import-export/
│   ├── sdk/
│   └── testing/
│
├── modules/
│   ├── crm/
│   ├── projects/
│   ├── documents/
│   ├── finance/
│   ├── hr/
│   ├── payroll/
│   ├── procurement/
│   ├── inventory/
│   ├── support/
│   ├── training/
│   ├── assets/
│   ├── travel/
│   └── marketplace/
│
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   ├── nginx/
│   ├── postgres/
│   ├── redis/
│   ├── keycloak/
│   ├── typesense/
│   ├── minio/
│   ├── observability/
│   └── scripts/
│
├── docs/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## App Responsibilities

### apps/api
NestJS backend application.

Owns:
- HTTP API
- API Gateway behavior
- request validation
- authentication middleware
- tenant context resolution
- module route mounting
- worker process bootstrapping if required

Does not own:
- business logic
- persistence rules
- UI
- direct external-provider usage outside platform packages

### apps/web
Main user-facing web application.

Owns:
- employee workspace
- manager workspace
- executive workspace
- customer portal
- vendor portal
- partner portal
- module UI pages

### apps/admin
Administrative control panel.

Owns:
- platform administration
- tenant administration
- organization setup
- module management
- security center
- audit center
- system settings

## Package Responsibilities

### packages/config
Shared config, environment schemas, constants.

### packages/database
MikroORM setup, entities, migrations, transaction manager, raw SQL helpers.

### packages/auth
Keycloak JWT validation, auth middleware helpers, identity provider client.

### packages/identity
Tnvios user shadow records, Keycloak sync, user lifecycle.

### packages/organization
Tenants, organizations, groups, business units, departments, teams, memberships.

### packages/permissions
RBAC, permission registration, permission evaluation.

### packages/policies
ABAC, field-level security, record-level security, data policies.

### packages/events
Event bus, outbox pattern, event schemas, event registry.

### packages/jobs
BullMQ queues, workers, job registry, retries.

### packages/workflow
Workflow definitions, workflow instances, approval system, task engine.

### packages/audit
Audit logs, authorization logs, immutable activity records.

### packages/notifications
Notification engine, in-app notifications, email provider abstraction, Resend provider.

### packages/files
File metadata, storage abstraction, signed URLs, malware scanning hooks.

### packages/search
Typesense indexing, search query layer, permission-filtered search.

### packages/analytics
Metrics, KPI framework, dashboard data services.

### packages/ai
AI Gateway, Vercel AI SDK integration, AI tools, pgvector retrieval, AI audit.

### packages/forms
Platform Form Engine, Zod validation, auto-save, drafts, field permissions.

### packages/ui
Tnvios UI Kit built on Tailwind + shadcn/ui + Radix.

### packages/onboarding
Onboarding flows, checklists, progress tracking.

### packages/help
Contextual help, guided tours, help content.

### packages/activity
Activity feed and timeline engine.

### packages/comments
Comments, threads, mentions, reactions, attachments.

### packages/inbound-email
Inbound email parsing, email-to-action, reply tokens.

### packages/import-export
CSV/Excel import/export, bulk jobs, templates, validation previews.

### packages/sdk
Module SDK for registering routes, permissions, events, navigation, forms, workflows, dashboards.

### packages/testing
Shared test utilities, fixtures, test database helpers.

## Module Structure

Every module must follow:

```text
modules/{module-name}/
├── manifest.ts
├── backend/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── dtos/
│   ├── entities/
│   ├── events/
│   ├── permissions/
│   ├── policies/
│   ├── workflows/
│   ├── import-export/
│   └── tests/
│
├── frontend/
│   ├── pages/
│   ├── components/
│   ├── forms/
│   ├── tables/
│   ├── widgets/
│   └── navigation/
│
└── docs/
```

## Import Rules

Allowed:
- modules import platform packages
- apps import modules
- apps import platform packages
- platform packages import lower-level platform packages

Forbidden:
- one module directly imports another module's service
- module writes directly to another module's tables
- frontend imports backend code
- modules import raw shadcn/ui directly
- modules import external providers directly

## Package Naming
Use scoped package names:

```text
@tnvios/database
@tnvios/auth
@tnvios/permissions
@tnvios/ui
@tnvios/forms
@tnvios/sdk
```
