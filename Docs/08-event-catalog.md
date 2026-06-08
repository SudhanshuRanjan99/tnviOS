# Tnvios Event Catalog

## Purpose
This document defines event naming, event payloads, publishers, and consumers.

## Event Naming

Format:
```text
domain.entity.action
```

Examples:
```text
identity.user.created
organization.organization.created
crm.customer.created
finance.invoice.paid
workflow.task.approved
ai.tool.executed
```

## Event Structure

```json
{
  "eventId": "uuid",
  "eventType": "crm.customer.created",
  "eventVersion": 1,
  "timestamp": "2026-06-08T00:00:00Z",
  "tenantId": "uuid",
  "organizationId": "uuid",
  "userId": "uuid",
  "correlationId": "uuid",
  "causationId": "uuid",
  "source": "crm",
  "aggregateType": "crm_customer",
  "aggregateId": "uuid",
  "data": {}
}
```

## Required Fields
- eventId
- eventType
- eventVersion
- timestamp
- source
- data

For business events:
- tenantId
- organizationId

## Publishing Rule
Events must be written to `outbox_events` inside the same transaction as the business mutation.

Outbox worker publishes events after commit.

## Core Events

### Identity

```text
identity.user.created
identity.user.updated
identity.user.deactivated
identity.user.logged_in
identity.user.logged_out
identity.user.email_verified
identity.user.mfa_updated
```

### Organization

```text
organization.tenant.created
organization.group.created
organization.organization.created
organization.business_unit.created
organization.department.created
organization.team.created
organization.membership.created
organization.membership.updated
organization.membership.deactivated
```

### Permission

```text
permission.role.created
permission.role.updated
permission.role.deleted
permission.permission.registered
permission.user_role.assigned
permission.user_role.removed
permission.policy.created
permission.policy.updated
permission.access.denied
```

### Workflow

```text
workflow.definition.created
workflow.definition.published
workflow.instance.started
workflow.task.created
workflow.task.approved
workflow.task.rejected
workflow.instance.completed
workflow.instance.failed
workflow.instance.cancelled
workflow.instance.escalated
```

### Notification

```text
notification.created
notification.sent
notification.failed
notification.read
```

### File

```text
file.uploaded
file.scanned
file.attached
file.downloaded
file.deleted
```

### Activity

```text
activity.event.created
```

### Comments

```text
comment.thread.created
comment.created
comment.updated
comment.deleted
comment.mention.created
```

### Import / Export

```text
import.job.created
import.job.validated
import.job.completed
import.job.failed
export.job.created
export.job.completed
export.job.failed
```

### AI

```text
ai.conversation.created
ai.message.created
ai.tool.requested
ai.tool.executed
ai.tool.denied
ai.embedding.created
ai.report.generated
```

### CRM

```text
crm.customer.created
crm.customer.updated
crm.customer.deleted
crm.lead.created
crm.lead.updated
crm.opportunity.created
crm.opportunity.closed
```

### Finance

```text
finance.invoice.created
finance.invoice.submitted
finance.invoice.approved
finance.invoice.rejected
finance.invoice.paid
finance.payment.received
```

### Projects

```text
projects.project.created
projects.project.updated
projects.task.created
projects.task.assigned
projects.task.completed
```

## Consumer Examples

`crm.customer.created` consumers:
- Activity Feed Engine
- Search Indexer
- Analytics Engine
- AI Embedding Worker
- Notification Engine if configured

`workflow.task.approved` consumers:
- Activity Feed Engine
- Audit Engine
- Notification Engine
- Workflow Engine continuation
- Analytics Engine

`comment.mention.created` consumers:
- Notification Engine
- Activity Feed Engine
- Email provider if enabled

## Idempotency
Every event consumer must be idempotent.

Use:
```text
event_id
consumer_name
processed_at
```

to prevent duplicate side effects.
