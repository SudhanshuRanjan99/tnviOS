# Tnvios

Tnvios is an enterprise-grade, multi-tenant, modular business operating system.

## Repository Status

The Turborepo monorepo foundation is initialized. Implementation must follow the
dependency order in `Docs/22-ai-build-sequence.md`.

## Workspace Layout

pnpm discovers packages from:

```text
apps/*
packages/*
modules/*
```

Internal dependencies must use the `workspace:` protocol.

## TypeScript Configurations

Shared TypeScript presets are available from `@tnvios/typescript-config`:

```text
@tnvios/typescript-config/base.json
@tnvios/typescript-config/nest.json
@tnvios/typescript-config/nextjs.json
```

## Code Quality

```bash
pnpm lint
pnpm lint:root
pnpm format
pnpm format:check
```

## Environment Validation

`@tnvios/config` owns shared constants, typed environment schemas, environment
file loading, and safe validation errors.

Copy `.env.example` to the required environment-specific file and replace all
placeholder secrets. Validate a file before starting services:

```bash
pnpm env:validate .env.local
pnpm env:validate .env.test
pnpm env:validate .env.staging
pnpm env:validate .env.production
```

## Database Foundation

`@tnvios/database` owns shared database contracts, PostgreSQL constants,
UUIDv7 entity identifier utilities, and production-safe MikroORM PostgreSQL
configuration. The migration system provides transactional, all-or-nothing
MikroORM migrations, ownership registration, status checks, forward execution,
and guarded explicit rollback. `TransactionManager.run()` provides the required
mutation boundary and carries tenant, organization, actor, and correlation
context through the transaction. The raw SQL helper provides typed reads,
separate parameter binding, and transaction-only mutations for complex
repository queries. Test database helpers create uniquely named, migrated
PostgreSQL databases and guarantee cleanup for integration suites.

Run database integration tests against the local PostgreSQL service:

```bash
pnpm docker:test:up
pnpm --filter @tnvios/database test:integration
```

Vitest loads `TNVIOS_TEST_DATABASE_URL` from the ignored local `.env.test`
file. The committed `.env.example` documents the matching Docker Compose URL.
The dedicated ephemeral `postgres-test` service listens on port `5433`, keeping
integration test databases separate from development data.

```bash
pnpm migration:status
pnpm migration:up
```

## Jobs and Notifications

`@tnvios/jobs` provides the shared BullMQ job registry, queue producer, worker
factory, payload validation, and the default three-attempt exponential retry
policy. BullMQ executes background work; Redis Streams remains the domain event
bus.

`@tnvios/notifications` provides the shared Notification Engine, tenant-aware
email and in-app templates, in-app inbox records, delivery logs, provider
abstraction, and the default Resend provider. Modules call the Notification
Engine or publish domain events; they do not call Resend directly.

Notification creation and read-state changes produce audit logs and outbox
events. Email delivery is queued as the registered
`notification.email.deliver` job. Configure:

```text
RESEND_API_KEY
NOTIFICATION_EMAIL_FROM
```

API routes:

```text
GET   /api/v1/notifications/inbox
PATCH /api/v1/notifications/:id/read
POST  /api/v1/notifications/templates
POST  /internal/v1/notifications
```

## File Engine

`@tnvios/files` owns private file metadata, lifecycle rules, explicit record
grants, storage provider abstraction, malware scanning hooks, and short-lived
signed URLs. The default S3-compatible provider works with local MinIO and
production S3-compatible storage.

The API never proxies file bytes. It registers metadata and returns a signed
`PUT` URL. After upload completion, a scanner must mark the file `available`
before the File Engine will issue a signed `GET` URL. Signed URLs expire within
15 minutes, and organization file listings include only files owned by or
explicitly granted to the current user.

File registration, upload completion, scan approval, permission grants,
downloads, and deletion produce audit records and outbox events. Storage
configuration uses:

```text
S3_ENDPOINT
S3_ACCESS_KEY
S3_SECRET_KEY
S3_BUCKET
```

API routes:

```text
GET    /api/v1/files
POST   /api/v1/files
POST   /api/v1/files/:id/complete
POST   /api/v1/files/:id/download-url
PATCH  /api/v1/files/:id/permissions
DELETE /api/v1/files/:id
```

## Local Dependencies

Docker Compose provides PostgreSQL with pgvector, Redis, Keycloak, Typesense,
MinIO, OpenTelemetry Collector, Prometheus, and Grafana.

```bash
pnpm docker:config
pnpm docker:up
pnpm docker:logs
pnpm docker:down
```

Local management interfaces:

```text
Keycloak: http://localhost:8080

The imported `tnvios` realm includes:

- `tnvios-api`, a confidential service-account client used by backend integrations
- `tnvios-web` and `tnvios-admin`, public browser clients that require Authorization Code + PKCE
- an access-token audience mapper for `tnvios-api`

`@tnvios/auth` owns typed Keycloak/OIDC discovery and service-account token
acquisition. The API exposes it through a lazy shared provider. Keycloak proves
identity only; Tnvios business roles and permissions must never be stored or
evaluated there.

The API validates Keycloak access-token signatures against the realm JWKS and
requires the configured issuer, `tnvios-api` audience, token lifetime, and
subject claim. Authentication is enforced globally; routes such as health
checks must opt out explicitly with `@PublicRoute()`. Validated Keycloak roles
are intentionally ignored because business authorization belongs to Tnvios.

`@tnvios/identity` owns the Tnvios shadow-user entity linked to Keycloak by
`keycloak_user_id`. New shadow users default to `pending`; supported lifecycle
states are `pending`, `active`, and `disabled`. The `users` table stores identity
claims and login state only, never Keycloak roles or Tnvios memberships and
permissions.

After JWT validation, protected API requests resolve the Keycloak subject to a
Tnvios shadow user. A missing user is transactionally created with
`status=pending`. Disabled users receive `403 ACCOUNT_DISABLED`. Pending and
active identities continue to the Organization Engine, where business routes
require active tenant and organization membership. No membership still means
no business access.

Phase 4 auth tests cover trusted and untrusted JWTs, issuer/audience/lifetime
checks, public and protected HTTP routes, first-login status gates, identity
claim handling, webhook signatures, tampering, staleness, replay rejection, and
Keycloak-to-Tnvios event mapping.

`@tnvios/organization` is the source of truth for tenants, groups, legal
organizations, business units, departments, teams, and memberships. Its
PostgreSQL migration creates the hierarchy with tenant-scoped indexes, foreign
keys, and unique membership constraints.

Organization APIs are available below `/api/v1/organization`. Tenant-scoped
routes require an active membership somewhere in the requested tenant;
organization-scoped routes require an active membership in the exact requested
organization. Optional business-unit, department, and team headers are
validated as one consistent parent chain. Tenant creation is the sole
authenticated bootstrap route without pre-existing organization context.

`@tnvios/policies` owns permissions, organization-scoped roles, role
permissions, user-role assignments, scope evaluation, field grants, resource
overrides, and authorization decision contracts. Access defaults to deny.
Explicit record denies override role grants, and every persisted runtime
decision writes an authorization log.

Routes opt into runtime authorization with `@RequirePermission()`. Permission
management APIs live below `/api/v1/policies` and require
`system.authorization.manage`; the initial administrator grant must therefore
be provisioned through a trusted bootstrap process. The evaluate endpoint uses
the same engine for authenticated callers inside a validated organization
context. Shared `filterFields()` and `filterRecords()` helpers provide the
field-level and record-level security foundations for later modules.

`@tnvios/audit` owns immutable audit records. `@tnvios/events` owns canonical
event envelopes, the persistent event registry, transactional outbox entities,
Redis Streams publishing, retry-aware outbox processing, and consumer
idempotency contracts.

Business persistence can call `AuditEventsPersistence.recordMutation()` to
persist the mutated entity, its audit record, and its outbox event in one
PostgreSQL transaction. Outbox workers atomically claim ready rows with
`FOR UPDATE SKIP LOCKED`, validate each event against the registry, publish to
the `tnvios:events` Redis Stream, and record publish or retry state.

Event registry and organization-scoped audit APIs live below `/api/v1/events`.
Authenticated internal workers can process a batch through
`POST /internal/v1/events/outbox/process`. Consumer implementations use the
transactional `IdempotentConsumerRunner` contract and the unique
`event_id + consumer_name` receipt constraint to prevent duplicate side
effects.

Keycloak event-listener bridges can synchronize shadow users through
`POST /internal/v1/identity/keycloak/events`. Deliveries must include
`X-Tnvios-Keycloak-Signature: sha256=<hmac>` and
`X-Tnvios-Webhook-Timestamp: <unix-seconds>`. The HMAC input is
`<timestamp>.<raw-request-body>` using `KEYCLOAK_WEBHOOK_SECRET`. The endpoint
rejects stale, tampered, unsupported, and replayed events. Structured sync logs
are emitted now; durable identity-event publication and audit records are added
with the later Events and Audit phases.
MinIO Console: http://localhost:9002
Prometheus: http://localhost:9090
Grafana: http://localhost:3001
```

## API Shell

The NestJS API shell exposes its initial health endpoint at:

```text
GET http://localhost:4000/api/v1/health
```

Start it with validated environment variables and optional `API_HOST` / `API_PORT`
runtime overrides:

```bash
pnpm --filter @tnvios/api dev
```

Every API request receives an isolated shared request context. Tenant,
organization, and hierarchy IDs are parsed from the standard API headers, and
`X-Correlation-ID` is generated when absent and returned on the response.

`@tnvios/logging` emits one structured JSON record per line, automatically
enriches API logs with the active request context, and recursively redacts
sensitive attribute keys. The API records completed requests without logging
headers, query values, or request bodies.

`@tnvios/telemetry` initializes the OpenTelemetry Node SDK before API modules
load, exports structured logs, traces, and request metrics to the local OTLP
collector, and enriches active server spans with correlation and tenant
hierarchy context.

## Web Shell

The main Next.js workspace shell runs at `http://localhost:3000` and exposes a
deployment health probe at `GET /api/health`.

```bash
pnpm --filter @tnvios/web dev
```

## Admin Shell

The Next.js administration control center runs at `http://localhost:3002` and
exposes a deployment health probe at `GET /api/health`.

```bash
pnpm --filter @tnvios/admin dev
```

## Root Commands

```bash
pnpm build
pnpm dev
pnpm lint
pnpm test
pnpm typecheck
```
