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
3. Next.js admin app shell. done
4. shared request context. done
5. structured logging. done
6. OpenTelemetry setup. done

### Phase 4: Identity and Auth

1. Keycloak integration. done
2. JWT validation. done
3. user shadow table. done
4. Keycloak webhook sync endpoint. done
5. first-login provisioning. done
6. auth tests. done

### Phase 5: Organization Engine

1. tenants. done
2. groups. done
3. organizations. done
4. business units. done
5. departments. done
6. teams. done
7. memberships. done
8. organization APIs. done
9. tenant/org context resolver. done

### Phase 6: Permission and Policy Engine

1. permissions. done
2. roles. done
3. role permissions. done
4. user roles. done
5. scope evaluator. done
6. authorization logs. done
7. field-level security foundation. done
8. record-level security foundation. done

### Phase 7: Audit and Events

1. audit logs. done
2. outbox events. done
3. event registry. done
4. Redis Streams publisher. done
5. outbox worker. done
6. idempotent consumer framework. done

### Phase 8: Jobs and Notifications

1. BullMQ setup. done
2. job registry. done
3. Notification Engine. done
4. Resend provider. done
5. in-app notifications. done
6. email templates. done

### Phase 9: Files

1. File Engine. done
2. S3/MinIO provider. done
3. signed URLs. done
4. file permissions. done
5. file audit. done

### Phase 10: Search

1. Typesense setup. done
2. search index registry. done
3. search indexing workers. done
4. permission-filtered search. done
5. pgvector foundation for AI retrieval. done

### Phase 11: Workflow Engine

1. workflow definitions. done
2. workflow versions. done
3. workflow instances. done
4. workflow tasks. done
5. approvals. done
6. conditions. done
7. workflow events. done
8. workflow audit. done

### Phase 12: UI Foundation

1. Tailwind setup. done
2. shadcn/ui base. done
3. Tnvios UI Kit. done
4. app shell. done
5. sidebar. done
6. top nav. done
7. data table. done
8. dialogs/drawers. done
9. empty states. done
10. dark mode. done

### Phase 13: Platform Form Engine

1. controlled form state. done
2. Zod validation. done
3. field permissions. done
4. drafts. done
5. auto-save. done
6. workflow submit bar. done
7. form audit integration. done

### Phase 14: Shared Enterprise Services

1. Onboarding Engine. done
2. Help & Guidance Engine. done
3. Activity Feed Engine. done
4. Comments & Mentions Engine. done
5. Import/Export Engine. done
6. Inbound Email Engine. done

### Phase 15: First Enterprise Modules

1. CRM. done
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
