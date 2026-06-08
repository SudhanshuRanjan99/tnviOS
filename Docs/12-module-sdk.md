# Tnvios Module SDK Specification

## Purpose
The Module SDK defines how modules are built, registered, installed, upgraded, secured, and integrated.

## Module Principles
Every module must be:
- independent
- versioned
- installable
- upgradeable
- removable where safe
- tenant-aware
- permission-aware
- event-driven
- auditable
- workflow-aware
- AI-ready
- searchable
- import/export capable

## Module Structure

```text
modules/{module}/
├── manifest.ts
├── backend/
├── frontend/
└── docs/
```

## Manifest Example

```ts
export default defineModule({
  name: "crm",
  displayName: "CRM",
  version: "1.0.0",
  description: "Customer Relationship Management",
  dependencies: [],
  permissions: [
    "crm.customer.read",
    "crm.customer.create",
    "crm.customer.update",
    "crm.customer.delete"
  ],
  events: [
    "crm.customer.created",
    "crm.customer.updated"
  ],
  routes: [],
  navigation: [],
  workflows: [],
  searchEntities: [],
  aiTools: [],
  importExport: []
});
```

## Module Registration Areas

Modules may register:
- routes
- controllers
- services
- repositories
- entities
- migrations
- permissions
- policies
- events
- event handlers
- workflows
- forms
- navigation
- dashboard widgets
- search entities
- AI tools
- import/export templates

## Module Restrictions

Modules may not:
- bypass Permission Engine
- bypass Workflow Engine
- bypass Audit Engine
- bypass Notification Engine
- bypass File Engine
- bypass Comment Engine
- directly write another module's tables
- call another module directly without approved platform service
- create custom auth logic
- create custom tenant logic

## Module Installation Flow

```text
validate manifest
↓
validate dependencies
↓
verify signature if marketplace module
↓
run migrations
↓
register permissions
↓
register routes
↓
register navigation
↓
register events
↓
register workflows
↓
register search entities
↓
register import/export templates
↓
enable module
```

## Module Database Rules
Module tables must:
- use module prefix
- include tenant_id
- include organization_id
- include audit fields
- include soft delete fields if deletable
- support RLS

Example:
```text
crm_customers
finance_invoices
hr_employees
projects_tasks
```

## Module Events
Modules communicate through events.

Forbidden:
```text
CRM service directly calls Finance service.
```

Allowed:
```text
CRM publishes crm.customer.created.
Finance consumes event if needed.
```

## Module UI
Module UI must use:
```ts
@tnvios/ui
@tnvios/forms
@tnvios/sdk
```

## Module AI Tools
AI tools registered by modules must:
- declare required permission
- validate tenant/org
- call application services
- create audit logs
- never bypass workflows
