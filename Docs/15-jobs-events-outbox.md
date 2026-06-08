# Tnvios Jobs, Events, and Outbox Architecture

## Purpose
This document defines boundaries between jobs, events, and reliable publishing.

## Tool Boundaries

```text
Redis Streams = domain event bus phase 1
Kafka = domain event bus phase 2
BullMQ = background jobs
Outbox table = reliable event publishing
Temporal = future durable workflow runtime
```

## Domain Events
Domain events are business facts.

Examples:
```text
crm.customer.created
finance.invoice.paid
workflow.task.approved
```

Events are not commands.

## Jobs
Jobs are work to be done.

Examples:
```text
send email
generate report
process import
reindex search
create embedding
scan file
deliver webhook
```

## Outbox Pattern

All business mutations must follow:

```text
start transaction
↓
write business record
↓
write audit log
↓
write outbox event
↓
commit
↓
outbox worker publishes event
↓
event consumers process side effects
```

## Why Outbox
Prevents:
- database committed but event lost
- event published but database rolled back
- duplicate side effects
- inconsistent workflows

## Outbox Worker
Responsibilities:
- find pending outbox events
- publish to event bus
- mark published
- retry failures
- move poison events to failure table
- preserve event ordering where needed

## BullMQ Queues

Recommended queues:
```text
email
notifications
files
imports
exports
search-indexing
ai-embeddings
reports
webhooks
audit-processing
workflow-timers
```

## Retry Policy
Default:
```text
3 retries
exponential backoff
dead letter after final failure
```

## Idempotency
Every consumer must be idempotent.

Store:
```text
event_id
consumer_name
processed_at
status
```

## Scheduled Jobs
Use BullMQ repeatable jobs initially.

Use Temporal later for long-running durable business workflows if needed.

## Forbidden
- publishing events directly inside controller
- sending email inside transaction
- calling external APIs inside transaction
- running heavy import synchronously in request
- using BullMQ as domain event source of truth
