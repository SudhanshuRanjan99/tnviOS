# Tnvios DevOps and Infrastructure

## Purpose
This document defines infrastructure for local, staging, and production environments.

## Local Development Services

```text
PostgreSQL 17+
Redis
Keycloak
Typesense
MinIO
OpenTelemetry Collector
Prometheus
Grafana
API app
Web app
Admin app
BullMQ workers
```

## Docker Compose Required
Local development should use Docker Compose for dependencies.

## Environment Files

```text
.env.example
.env.local
.env.test
.env.staging
.env.production
```

Secrets must not be committed.

## Required Environment Variables

```text
DATABASE_URL
REDIS_URL
KEYCLOAK_ISSUER_URL
KEYCLOAK_CLIENT_ID
KEYCLOAK_CLIENT_SECRET
JWT_AUDIENCE
S3_ENDPOINT
S3_ACCESS_KEY
S3_SECRET_KEY
S3_BUCKET
TYPESENSE_HOST
TYPESENSE_API_KEY
RESEND_API_KEY
OTEL_EXPORTER_OTLP_ENDPOINT
```

## Production Architecture

```text
Cloudflare / WAF
↓
Load Balancer / Nginx
↓
API
↓
Core Engines
↓
PostgreSQL + Redis + Typesense + Object Storage
↓
Workers
↓
Observability
```

## Observability
Required:
- structured JSON logs
- correlation IDs
- OpenTelemetry traces
- Prometheus metrics
- Grafana dashboards
- request latency
- permission check latency
- workflow latency
- job failure rate
- event processing latency
- AI usage metrics

## Backups
PostgreSQL:
- daily full backup
- WAL archiving
- point-in-time recovery

Object storage:
- versioning
- retention policy

Redis:
- persistence strategy depending on queue/event needs

## Security
- no public database
- no public Redis
- private networking
- TLS everywhere
- secret manager for production
- least privilege service accounts
- audit deployment actions

## Deployment Stages

```text
local
development
staging
production
```

## Future Infrastructure
Phase 2/3:
- Kubernetes
- Kafka
- Temporal
- ClickHouse
- OpenTelemetry collector cluster
- SIEM integration
- multi-region deployment
