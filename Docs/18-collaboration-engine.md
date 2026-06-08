# Tnvios Collaboration Engine

## Purpose
This document defines activity feeds, timelines, comments, and mentions.

## Core Components

```text
Activity Feed Engine
Comments Engine
Mentions System
Timeline Renderer
Notification Integration
Audit Integration
```

## Activity Feed

Every major business entity should have a timeline.

Examples:
- customer timeline
- invoice timeline
- project timeline
- task timeline
- employee timeline
- vendor timeline
- workflow timeline
- file timeline

## Activity Sources
Activity Feed consumes:
- domain events
- audit logs
- comments
- file uploads
- workflow actions
- email actions
- AI actions
- status changes

## Activity Event Example

```json
{
  "entityType": "finance_invoice",
  "entityId": "uuid",
  "activityType": "workflow.task.approved",
  "title": "Invoice approved",
  "actorUserId": "uuid",
  "metadata": {
    "amount": 10000
  }
}
```

## Comments

Comments support:
- threads
- replies
- rich text body through Tiptap
- attachments
- reactions
- edit/delete
- mentions
- audit for sensitive records

## Mentions

Mention flow:

```text
user types @name
↓
search mentionable users
↓
filter users by record access
↓
create comment
↓
create mention record
↓
notify mentioned user
↓
add activity event
```

## Mention Security
A user may only mention another user if:
- mentioned user exists in tenant
- mentioned user has access to entity or can be granted access by policy
- mention does not leak restricted information

## Events

```text
comment.thread.created
comment.created
comment.updated
comment.deleted
comment.mention.created
activity.event.created
```

## Future Collaboration
Phase 2/3 may add:
- Yjs collaborative editing
- PartyKit realtime rooms
- live cursors
- collaborative documents
