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

```powershell
$env:TNVIOS_TEST_DATABASE_URL="postgresql://tnvios:tnvios@localhost:5432/tnvios"
pnpm --filter @tnvios/database test:integration
```

```bash
pnpm migration:status
pnpm migration:up
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

## Web Shell

The main Next.js workspace shell runs at `http://localhost:3000` and exposes a
deployment health probe at `GET /api/health`.

```bash
pnpm --filter @tnvios/web dev
```

## Root Commands

```bash
pnpm build
pnpm dev
pnpm lint
pnpm test
pnpm typecheck
```
