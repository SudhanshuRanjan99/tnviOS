# Tnvios Platform Form Engine

## Purpose
Tnvios forms must support enterprise behavior:
- controlled components
- Zod validation
- draft states
- auto-save
- field-level permissions
- record-level permissions
- workflow-aware submission
- approvals
- attachments
- comments
- audit logs

React Hook Form is not the platform standard.

## Core Rule
Tnvios forms are managed by the Platform Form Engine.

## Form Lifecycle

```text
load form definition
↓
load record
↓
load permissions
↓
load field policies
↓
render controlled fields
↓
validate with Zod
↓
auto-save draft if enabled
↓
submit
↓
check workflow requirement
↓
execute mutation
↓
write audit log
↓
publish event
```

## Form Definition

A form definition includes:
- form key
- module
- entity type
- mode
- fields
- validation schema
- field permissions
- draft behavior
- auto-save behavior
- workflow behavior
- submit actions

Example:

```ts
defineForm({
  key: "crm.customer.create",
  module: "crm",
  entity: "customer",
  schema: CreateCustomerSchema,
  fields: [
    { name: "name", type: "text", required: true },
    { name: "email", type: "email" },
    { name: "phone", type: "phone" }
  ],
  permissions: {
    create: "crm.customer.create"
  }
});
```

## Field-Level Permissions

Each field may be:
- visible
- hidden
- read-only
- editable
- masked
- required
- conditionally required

Example:
Salary field:
- visible to HR with `hr.employee.salary.view`
- hidden from normal employee
- masked for manager without salary permission

## Drafts

Drafts required for:
- long forms
- finance documents
- HR records
- procurement requests
- project proposals
- onboarding forms

Draft states:
```text
draft
auto_saved
submitted
pending_approval
approved
rejected
cancelled
```

## Auto-Save

Auto-save must:
- debounce changes
- store drafts safely
- handle conflicts
- show save status
- avoid submitting workflows accidentally

## Workflow Integration

Forms may have submit modes:
```text
save
submit
submit_for_approval
approve
reject
request_changes
```

If workflow required:
- form submission starts workflow instance
- approval bar appears
- workflow state controls editable fields

## Audit
Every form mutation must audit:
- changed fields
- old values
- new values
- actor
- timestamp
- IP/user agent
- correlation ID

## Comments and Attachments
Forms may support:
- record comments
- inline comments later
- attachments through File Engine
- mentions through Comments Engine
