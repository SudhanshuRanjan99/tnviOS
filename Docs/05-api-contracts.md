# Tnvios API Contract Standards

## Purpose
This document defines API rules and endpoint contracts for AI code generation.

## Base URL Pattern

```text
/api/v1/{module}/{resource}
```

Examples:

```text
/api/v1/organization/tenants
/api/v1/organization/organizations
/api/v1/crm/customers
/api/v1/projects/tasks
/api/v1/workflows
/api/v1/files
/api/v1/ai/chat
```

## Internal API Pattern

```text
/internal/v1/{service}/{resource}
```

Internal APIs are not public.

Examples:
```text
/internal/v1/identity/keycloak/events
/internal/v1/events/outbox/process
/internal/v1/search/reindex
```

## Required Request Headers

```http
Authorization: Bearer <keycloak_access_token>
X-Tenant-ID: <uuid>
X-Organization-ID: <uuid>
X-Correlation-ID: <uuid optional, generated if missing>
```

Optional:
```http
X-Business-Unit-ID
X-Department-ID
X-Team-ID
```

## Response Format

### Success

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Collection

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 100
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "CRM_CUSTOMER_NOT_FOUND",
    "message": "Customer not found",
    "details": {}
  }
}
```

## Endpoint Requirements

Every protected endpoint must define:
- method
- path
- permission
- request DTO
- response DTO
- audit requirement
- event emitted
- workflow requirement
- rate limit if special
- idempotency requirement if mutation is sensitive

## Pagination

```text
?page=1&pageSize=25
```

Max page size: 100.

## Filtering

```text
?status=active&type=corporate
```

## Sorting

```text
?sort=name
?sort=-createdAt
```

## Search

```text
?q=searchterm
```

## Field Selection

```text
?fields=id,name,email
```

Field selection must respect field-level permissions.

## Idempotency

Required for:
- payments
- imports
- bulk operations
- workflow approval decisions
- email-to-action actions
- external webhooks
- finance mutations

Header:

```http
Idempotency-Key: <unique-key>
```

## Standard CRUD Contract

### Create
```http
POST /api/v1/{module}/{resource}
```

Required flow:
```text
authenticate
validate tenant
validate organization
check permission
validate DTO
execute transaction
write audit log
write outbox event
return response
```

### Read
```http
GET /api/v1/{module}/{resource}/{id}
```

Required flow:
```text
authenticate
validate tenant
validate organization
check permission
check record access
filter fields
return response
```

### Update
```http
PATCH /api/v1/{module}/{resource}/{id}
```

Required flow:
```text
authenticate
validate tenant
validate organization
check permission
check record access
check workflow requirement
validate DTO
execute transaction
write audit log
write outbox event
return response
```

### Delete
```http
DELETE /api/v1/{module}/{resource}/{id}
```

Soft delete only.

## Example: Create Customer

```http
POST /api/v1/crm/customers
```

Permission:
```text
crm.customer.create
```

Request:
```json
{
  "type": "corporate",
  "name": "ABC Pvt Ltd",
  "email": "contact@example.com",
  "phone": "+9779800000000"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customerCode": "CUS-0001",
    "type": "corporate",
    "name": "ABC Pvt Ltd",
    "email": "contact@example.com",
    "phone": "+9779800000000",
    "status": "active"
  }
}
```

Audit:
```text
crm.customer.created
```

Event:
```text
crm.customer.created
```

Workflow:
```text
none by default
```

## Example: Submit Invoice for Approval

```http
POST /api/v1/finance/invoices/{id}/submit
```

Permission:
```text
finance.invoice.submit
```

Required:
- invoice exists
- invoice belongs to tenant/org
- user can access invoice
- invoice status allows submission
- workflow definition exists

Audit:
```text
finance.invoice.submitted
```

Event:
```text
finance.invoice.submitted
workflow.started
```

Workflow:
```text
Invoice Approval
```

## Error Codes

Format:
```text
MODULE_RESOURCE_ERROR
```

Examples:
```text
AUTH_INVALID_TOKEN
TENANT_NOT_FOUND
ORG_ACCESS_DENIED
PERMISSION_DENIED
CRM_CUSTOMER_NOT_FOUND
WORKFLOW_NOT_AVAILABLE
VALIDATION_ERROR
FIELD_ACCESS_DENIED
IMPORT_INVALID_FILE
EXPORT_NOT_ALLOWED
```

## AI API Contract

### AI Chat

```http
POST /api/v1/ai/chat
```

Request:
```json
{
  "conversationId": "uuid optional",
  "message": "Show overdue invoices",
  "context": {
    "module": "finance",
    "page": "invoices"
  }
}
```

Required:
- authenticate user
- validate tenant/org
- create AI audit log
- call AI Gateway
- tools must pass permissions
- no unauthorized data retrieval

## Internal Keycloak Sync

```http
POST /internal/v1/identity/keycloak/events
```

Required:
- verify webhook signature
- validate event type
- upsert shadow user
- publish Tnvios identity event
- audit sync result
