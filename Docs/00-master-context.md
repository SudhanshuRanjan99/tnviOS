# Tnvios Master Build Context

## Product Name
Tnvios

## Product Type
Tnvios is a full enterprise-grade, multi-tenant, modular business operating system.

It is not an MVP, not a simple CRM, not a small SaaS, and not a monolithic ERP.

Tnvios is designed to support:
- Group headquarters
- Legal organizations
- Business units
- Departments
- Teams
- Employees
- Customers
- Vendors
- Partners
- AI agents
- Third-party modules
- Enterprise workflows
- Marketplace extensions

## Core Product Goal
Tnvios must allow an organization to operate its business from one unified platform through:
- Shared identity
- Shared organizational hierarchy
- Shared permissions
- Shared workflows
- Shared audit logs
- Shared notifications
- Shared files
- Shared activity feeds
- Shared search
- Shared analytics
- Shared AI layer
- Installable business modules

## Core Architecture Pattern
Tnvios follows:

```text
Platform Core
→ Core Engines
→ Shared Platform Services
→ Workspaces
→ Business Modules
→ AI Layer
→ Marketplace
→ Enterprise Extensions
```

## High-Level Layers

```text
Users
↓
Web / Admin / Portals
↓
API Gateway
↓
Security + Tenant Context
↓
Core Engines
↓
Business Modules
↓
PostgreSQL / Redis / Typesense / Object Storage / pgvector
↓
Analytics / AI / Events / Jobs / Observability
```

## Non-Negotiable Architecture Rules

1. No module may bypass authentication.
2. No module may bypass tenant validation.
3. No module may bypass organization validation.
4. No module may bypass the Permission & Policy Engine.
5. No module may build its own authorization system.
6. No module may build its own approval system.
7. No module may build its own notification system.
8. No module may build its own file storage system.
9. No module may build its own comment system.
10. No module may build its own import/export system.
11. No module may publish events outside the outbox pattern.
12. No AI tool may bypass normal application services.
13. No AI tool may write directly to the database.
14. No business logic belongs in controllers.
15. No database calls from frontend.
16. No database calls directly inside controllers.
17. No hardcoded tenant IDs.
18. No hardcoded organization IDs.
19. No use of `any` unless explicitly justified and approved.
20. No production schema sync.
21. No direct cross-module database writes.
22. No direct cross-module service calls unless through approved platform services.
23. No sensitive exports without field-level permission filtering.
24. No business decision without audit trail.

## Current Strategic Decision
Tnvios is being built as a full enterprise solution from the beginning.

However, implementation must still follow dependency order:
1. Foundation
2. Core engines
3. Shared services
4. Workspaces
5. Modules
6. AI
7. Marketplace
8. Advanced enterprise features

Full enterprise does not mean random build order.

## Product Name Usage
Use `Tnvios` everywhere.

Forbidden:
- BusinessOS
- businessos
- BizOS
- old project names

## Build Style for AI Agents
When using AI coding agents:
- Always read this document first.
- Do not invent dependencies.
- Do not invent folder structures.
- Do not skip tests.
- Do not skip audit logs.
- Do not skip permissions.
- Do not skip tenant checks.
- Output implementation in small, reviewable steps.
