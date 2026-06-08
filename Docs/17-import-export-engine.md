# Tnvios Import and Export Engine

## Purpose
Every module must support governed import/export through the shared Import/Export Engine.

Modules must not build their own import/export logic from scratch.

## Supported Operations

```text
CSV import
Excel import
CSV export
Excel export
PDF export
JSON export
template download
bulk update
bulk validation
error report
```

## Import Flow

```text
user uploads file
↓
File Engine stores file
↓
Import Engine detects columns
↓
user maps fields
↓
validate rows
↓
show preview and errors
↓
user confirms import
↓
BullMQ import job runs
↓
records created/updated in transactions
↓
audit logs created
↓
events emitted
↓
result report generated
```

## Export Flow

```text
user requests export
↓
check permission
↓
check field-level permissions
↓
create export job
↓
BullMQ export job runs
↓
generate file
↓
store in File Engine
↓
create signed URL
↓
audit export
```

## Import Job Tables
- import_jobs
- import_job_rows
- import_templates
- import_errors

## Export Job Tables
- export_jobs
- export_templates
- export_files

## Module Registration

Modules register import/export templates:

```ts
registerImportExport({
  module: "crm",
  entity: "customer",
  importPermission: "crm.customer.import",
  exportPermission: "crm.customer.export",
  fields: [
    { key: "name", required: true },
    { key: "email" },
    { key: "phone" }
  ]
});
```

## Validation
Validation must use:
- Zod schemas
- module business validators
- duplicate detection
- permission checks
- tenant/org validation

## Security
Export must filter:
- hidden fields
- restricted fields
- records user cannot access

Sensitive exports must:
- require permission
- create audit log
- optionally require workflow approval
- optionally require MFA

## Events

```text
import.job.created
import.job.validated
import.job.completed
import.job.failed
export.job.created
export.job.completed
export.job.failed
```
