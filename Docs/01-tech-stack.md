# Tnvios Final Technology Stack

## Purpose
This document defines the approved technology stack for Tnvios.

AI coding agents must follow this stack exactly. Do not replace tools unless a later Architecture Decision Record explicitly changes the decision.

## Backend

```text
Framework: NestJS
Language: TypeScript
Runtime: Node.js LTS
API Style: REST first
Future API: GraphQL only if required
```

## Frontend

```text
Framework: Next.js
Language: TypeScript
Server State: TanStack Query
Styling Layer: Tailwind CSS
Base Components: shadcn/ui
Component Primitives: Radix UI where applicable
Design System: Tnvios UI Kit
Forms: Tnvios Platform Form Engine
Validation: Zod
Rich Text Editor: Tiptap
AI UI: Vercel AI SDK
```

## Monorepo

```text
Build System: Turborepo
Package Manager: pnpm
```

## Database

```text
Primary Database: PostgreSQL 17+
ORM: MikroORM
Complex Queries: raw SQL
Analytics Queries: raw SQL
Vector Search: pgvector
```

## Search

```text
User-facing Search: Typesense
Internal Fallback Search: PostgreSQL Full Text Search
Semantic Search / RAG: pgvector
Future Analytics Search: ClickHouse projections if needed
```

## Authentication

```text
Identity Provider: Keycloak
Protocols: OIDC, OAuth2, SAML
Credential Storage: Keycloak
Token Issuance: Keycloak
Business Authorization: Tnvios
```

## Cache, Jobs, Events

```text
Cache: Redis
Background Jobs: BullMQ
Domain Event Bus Phase 1: Redis Streams
Domain Event Bus Phase 2: Kafka
Reliable Publishing: Outbox Pattern
Future Durable Workflows: Temporal.io
```

## Email and Notifications

```text
Default Email Provider: Resend
Email Provider Abstraction: Required
Future Notification Provider: Novu optional
```

## Storage

```text
Object Storage: S3-compatible
Development Storage: MinIO
Production Options: AWS S3, Cloudflare R2, MinIO, GCS-compatible provider
```

## AI

```text
AI Application SDK: Vercel AI SDK
AI Gateway: Tnvios AI Gateway
Embeddings: pgvector
AI Tools: Permission-aware Tnvios service calls
AI Audit: Required
```

## Observability

```text
Telemetry: OpenTelemetry SDK
Metrics: Prometheus
Dashboards: Grafana
Logs: Structured JSON logs
Tracing: OpenTelemetry traces
Correlation IDs: Required everywhere
```

## Testing

```text
Unit Tests: Vitest
Integration Tests: Vitest + real PostgreSQL
E2E Tests: Playwright
Database Test Environment: Docker/Testcontainers-style real DB
```

## Planned Phase 2/3 Technologies

```text
Temporal.io: durable workflow runtime
Novu: notification provider / notification inbox provider
Yjs: CRDT collaboration layer
PartyKit: realtime collaboration rooms
ElectricSQL: local-first/offline sync
ClickHouse: analytics/event warehouse
Kafka: large-scale domain event bus
```

## Explicitly Skipped

Do not use unless architecture changes:

```text
Prisma
Drizzle
TypeORM
React Hook Form as platform standard
OpenSearch in Phase 1
Trigger.dev
Inngest
```

## Tool Boundaries

```text
MikroORM = transactional domain persistence
raw SQL = reporting, analytics, bulk operations, permission-heavy reads
BullMQ = background jobs
Redis Streams/Kafka = domain events
Temporal = future durable execution runtime
Typesense = fast user-facing search
pgvector = AI semantic retrieval
Vercel AI SDK = AI UX and provider interaction layer
Resend = email delivery provider
Novu = optional future notification provider
Tiptap = rich-text editing
Yjs = future collaborative state
ClickHouse = future analytics warehouse
```

## Hard Rule
Tnvios platform abstractions must own behavior. External tools are implementation details, not business architecture.
