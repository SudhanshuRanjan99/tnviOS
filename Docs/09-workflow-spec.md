# Tnvios Workflow Engine Specification

## Purpose
The Workflow Engine provides centralized approvals, tasks, routing, automation, escalations, and workflow audit.

No module may implement its own approval system.

## Workflow Engine Owns
- workflow definitions
- workflow versions
- workflow instances
- workflow tasks
- approvals
- conditions
- escalation
- delegation
- workflow audit
- workflow events
- AI workflow nodes

## Workflow Types

```text
approval workflow
process workflow
automation workflow
AI-assisted workflow
integration workflow
scheduled workflow
```

## Node Types

```text
start
end
approval
task
condition
notification
AI
webhook
wait
integration
script-safe-action
```

## Workflow Definition Example

```json
{
  "name": "Invoice Approval",
  "version": 1,
  "trigger": {
    "type": "event",
    "eventType": "finance.invoice.submitted"
  },
  "steps": [
    {
      "key": "manager_approval",
      "type": "approval",
      "approver": {
        "type": "role",
        "role": "Finance Manager"
      }
    },
    {
      "key": "amount_condition",
      "type": "condition",
      "condition": {
        "field": "invoice.totalAmount",
        "operator": ">",
        "value": 10000
      }
    },
    {
      "key": "cfo_approval",
      "type": "approval",
      "approver": {
        "type": "role",
        "role": "CFO"
      }
    }
  ]
}
```

## Workflow Lifecycle

```text
draft
published
triggered
running
waiting
approved
rejected
completed
cancelled
failed
escalated
```

## Approval Rules

Approvals support:
- single approver
- multiple approvers
- sequential approval
- parallel approval
- role-based approval
- manager-based approval
- organization hierarchy approval
- amount-based approval
- policy-based approval

## Separation of Duties

Requester cannot approve their own request where policy forbids it.

Required for:
- finance
- payroll
- procurement
- user provisioning
- sensitive exports

## Delegation

Delegation must be:
- time-bound
- auditable
- revocable
- permission controlled

## Escalation

Escalations support:
- no action within time limit
- SLA breach
- reassignment
- manager escalation
- notification escalation

## AI Workflow Nodes

AI may:
- summarize
- classify
- recommend
- detect risk
- extract data
- draft response

AI may not:
- approve without human/policy permission
- bypass permissions
- access unauthorized data
- execute sensitive actions without workflow rules

## Workflow Events
Workflow Engine emits:
- workflow.instance.started
- workflow.task.created
- workflow.task.approved
- workflow.task.rejected
- workflow.instance.completed
- workflow.instance.failed
- workflow.instance.escalated

## Module Integration
Modules may register workflow templates but must not execute custom approval logic.

Example:
Finance registers "Invoice Approval".
Workflow Engine executes it.

## Temporal Future Integration
Temporal may be used later as durable execution runtime.

Boundary:
- Tnvios Workflow Engine owns business definitions, approvals, permissions, audit, and UI.
- Temporal owns durable execution for complex long-running workflows.
