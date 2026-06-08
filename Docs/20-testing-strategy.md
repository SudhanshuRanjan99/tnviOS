# Tnvios Testing Strategy

## Purpose
This document defines testing requirements.

## Testing Stack

```text
Unit Tests: Vitest
Integration Tests: Vitest + real PostgreSQL
E2E Tests: Playwright
Frontend Component Tests: Vitest + Testing Library where needed
```

## Required Test Types

### Unit Tests
For:
- pure utilities
- services
- permission rules
- policy rules
- workflow logic
- Zod schemas
- form engine logic
- event builders
- AI tool validators

### Integration Tests
For:
- repositories
- database transactions
- RLS behavior
- migrations
- outbox pattern
- event consumers
- import/export jobs
- search indexing
- Keycloak sync handler

### E2E Tests
For:
- login
- organization setup
- role assignment
- permission denied screens
- customer creation
- project creation
- invoice approval
- comment mention
- file upload
- import/export
- AI assistant permission behavior

## Mandatory Test Categories

```text
authentication tests
authorization tests
tenant isolation tests
organization isolation tests
field-level security tests
workflow approval tests
audit log tests
event publishing tests
outbox tests
AI tool tests
import/export tests
```

## Coverage Target
Minimum:
```text
80% unit/integration coverage for core packages
```

Critical packages require higher discipline:
- permissions
- policies
- workflow
- audit
- database
- auth
- ai

## Test Database
Use real PostgreSQL for integration tests.

Mocking database behavior is not enough for:
- transactions
- RLS
- migrations
- raw SQL
- indexes
- constraints
- pgvector behavior

## E2E Environment
Playwright tests should run against:
- API
- web app
- test database
- Keycloak test realm where possible
- mocked external providers for email/AI unless testing integration specifically

## Rule
No protected endpoint is complete without permission tests.
