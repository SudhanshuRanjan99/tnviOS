# Tnvios AI Build Sequence

## Purpose
This document tells AI coding agents what to build first.

Full enterprise solution does not mean random order.

## Build Order

### Phase 1: Repository Foundation

1. Create Turborepo monorepo. done
2. Configure pnpm workspaces. done
3. Configure shared TypeScript config. done
4. Configure ESLint and formatting. done
5. Configure environment validation. done
6. Create Docker Compose for local dependencies. done

### Phase 2: Core Infrastructure Packages

1. `@tnvios/config` done
2. `@tnvios/database` done
3. MikroORM setup done
4. migration system done
5. TransactionManager done
6. raw SQL helper done 
7. test database helpers done

### Phase 3: API and Web Shell

1. NestJS API app shell. done
2. Next.js web app shell. done
3. Next.js admin app shell. 
4. shared request context.
5. structured logging.
6. OpenTelemetry setup.

### Phase 4: Identity and Auth

1. Keycloak integration.
2. JWT validation.
3. user shadow table.
4. Keycloak webhook sync endpoint.
5. first-login provisioning.
6. auth tests.

### Phase 5: Organization Engine

1. tenants
2. groups
3. organizations
4. business units
5. departments
6. teams
7. memberships
8. organization APIs
9. tenant/org context resolver

### Phase 6: Permission and Policy Engine

1. permissions
2. roles
3. role permissions
4. user roles
5. scope evaluator
6. authorization logs
7. field-level security foundation
8. record-level security foundation

### Phase 7: Audit and Events

1. audit logs
2. outbox events
3. event registry
4. Redis Streams publisher
5. outbox worker
6. idempotent consumer framework

### Phase 8: Jobs and Notifications

1. BullMQ setup
2. job registry
3. Notification Engine
4. Resend provider
5. in-app notifications
6. email templates

### Phase 9: Files

1. File Engine
2. S3/MinIO provider
3. signed URLs
4. file permissions
5. file audit

### Phase 10: Search

1. Typesense setup
2. search index registry
3. search indexing workers
4. permission-filtered search
5. pgvector foundation for AI retrieval

### Phase 11: Workflow Engine

1. workflow definitions
2. workflow versions
3. workflow instances
4. workflow tasks
5. approvals
6. conditions
7. workflow events
8. workflow audit

### Phase 12: UI Foundation

1. Tailwind setup
2. shadcn/ui base
3. Tnvios UI Kit
4. app shell
5. sidebar
6. top nav
7. data table
8. dialogs/drawers
9. empty states
10. dark mode

### Phase 13: Platform Form Engine

1. controlled form state
2. Zod validation
3. field permissions
4. drafts
5. auto-save
6. workflow submit bar
7. form audit integration

### Phase 14: Shared Enterprise Services

1. Onboarding Engine
2. Help & Guidance Engine
3. Activity Feed Engine
4. Comments & Mentions Engine
5. Import/Export Engine
6. Inbound Email Engine

### Phase 15: First Enterprise Modules

1. CRM
2. Projects
3. Documents
4. Finance
5. HR
6. Procurement
7. Inventory

### Phase 16: AI Layer

1. Vercel AI SDK integration
2. AI Gateway
3. AI conversations
4. AI tools
5. pgvector RAG
6. permission-aware retrieval
7. AI audit logs
8. AI workflow nodes

### Phase 17: Marketplace and Advanced Enterprise

1. Module registry
2. module installation
3. module versions
4. module dependency checks
5. module signing
6. marketplace foundation
7. SSO/SAML hardening
8. advanced ABAC
9. Temporal integration if needed
10. ClickHouse analytics if needed

## Rule
Do not build business modules before Identity, Organization, Permission, Audit, Events, and Workflow foundations exist.
