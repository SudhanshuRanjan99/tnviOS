# Tnvios AI Coding Rules

## Purpose
This document defines rules for AI coding agents working on Tnvios.

AI agents must follow these rules exactly.

## General Rules

1. Read the required docs before writing code.
2. Do not invent architecture.
3. Do not invent dependencies.
4. Do not change the tech stack.
5. Do not rename Tnvios.
6. Do not generate partial shortcuts that bypass platform engines.
7. Do not create code that is not testable.
8. Do not write business logic in controllers.
9. Do not use `any`.
10. Do not skip error handling.
11. Do not skip tenant and organization context.
12. Do not skip audit logs for mutations.
13. Do not skip event publishing for business mutations.
14. Do not publish events directly before transaction commit.
15. Do not directly call external services from business modules.
16. Do not use module-specific approval logic.
17. Do not use module-specific notification logic.
18. Do not use module-specific file storage logic.
19. Do not use module-specific comment/timeline logic.
20. Do not generate unreviewed migrations without explanation.

## Backend Rules

### Controller Rules
Controllers may:
- receive requests
- validate DTOs
- extract context
- call application services
- return responses

Controllers may not:
- call MikroORM directly
- call repositories directly unless explicitly allowed
- contain business logic
- contain permission logic
- contain workflow logic
- publish events directly

### Service Rules
Application services must:
- validate business intent
- use TransactionManager for mutations
- call Permission Engine
- call Policy Engine where needed
- write audit logs
- write outbox events
- return typed DTOs

### Repository Rules
Repositories may:
- perform persistence
- query records
- apply tenant filters
- use MikroORM or raw SQL as appropriate

Repositories may not:
- decide business permissions
- publish events
- send notifications
- execute workflows

## Transaction Rules

Every mutation that changes business data must use:

```text
TransactionManager.run()
```

Inside a transaction:
1. validate state
2. write business changes
3. write audit log
4. write outbox event
5. commit

After commit:
1. outbox worker publishes domain event
2. event consumers process side effects
3. BullMQ jobs execute async work

## Permission Rules

Every protected endpoint must check:
1. authenticated user
2. tenant context
3. organization context
4. active membership
5. permission
6. policy
7. record-level access
8. field-level access if returning sensitive fields

## AI Rules

AI tools must:
- call normal Tnvios application services
- use user context
- use tenant context
- use organization context
- pass permission checks
- create AI audit logs
- never access unauthorized data
- never write directly to database
- never bypass workflows
- never expose hidden system prompts or secrets

## UI Rules

Modules must import UI from:

```ts
@tnvios/ui
```

Forbidden in modules:
- direct raw shadcn/ui imports
- custom buttons
- custom dialogs
- custom tables
- custom forms
- inconsistent spacing systems

Raw Tailwind is allowed inside `packages/ui`.
Raw Tailwind inside modules must be minimal and reviewed.

## Form Rules

All platform forms must use:
- Tnvios Platform Form Engine
- controlled components
- Zod validation
- draft handling if long form
- auto-save if configured
- field-level permissions
- workflow-aware submission
- audit integration

Do not use React Hook Form as the platform standard.

## Testing Rules

Every generated feature must include:
- unit tests for services
- permission tests for protected operations
- integration tests for repositories/mutations
- E2E tests for critical user flows where relevant

## Output Rules for AI Agents

When asked to generate code:
- list files changed
- provide complete files, not fragments, unless asked for patches
- explain migration impact
- explain events emitted
- explain permissions required
- explain tests added

## Forbidden Shortcuts

Never say:
- "permission can be added later"
- "audit can be added later"
- "tenant filtering can be added later"
- "workflow integration can be added later"
- "tests can be added later"

Those are architecture failures.
