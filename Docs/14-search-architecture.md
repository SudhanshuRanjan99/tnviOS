# Tnvios Search Architecture

## Purpose
This document defines search for Tnvios.

## Stack

```text
Typesense: user-facing search
PostgreSQL Full Text Search: internal fallback
pgvector: semantic search and AI retrieval
ClickHouse: future analytics search/projections
```

## Search Types

Tnvios supports:
- global search
- module search
- entity search
- autocomplete
- faceted filtering
- permission-filtered search
- semantic search
- AI retrieval
- activity/audit search

## Typesense Usage
Use Typesense for:
- global search bar
- module list search
- customer/project/task search
- autocomplete
- faceted filters
- fast user-facing search

## pgvector Usage
Use pgvector for:
- semantic retrieval
- AI memory
- document similarity
- knowledge base RAG
- AI assistant context

## Indexing Flow

```text
business event emitted
↓
search indexer consumes event
↓
loads entity using permission-safe projection
↓
updates Typesense document
↓
updates pgvector embedding if configured
```

## Search Permission Rules

Every search result must be filtered by:
- tenant
- organization
- membership
- permission
- record-level access
- field-level access

Never index sensitive fields into Typesense unless they are protected and filtered.

## Search Document Shape

Example:
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "organizationId": "uuid",
  "entityType": "crm_customer",
  "entityId": "uuid",
  "title": "ABC Pvt Ltd",
  "subtitle": "Customer",
  "module": "crm",
  "status": "active",
  "searchText": "ABC Pvt Ltd customer",
  "createdAt": "2026-06-08T00:00:00Z"
}
```

## Reindexing
Search Engine must support:
- reindex entity
- reindex module
- reindex tenant
- full reindex
- failed index retry

## Events Consumed
- crm.customer.created
- crm.customer.updated
- projects.project.created
- finance.invoice.created
- file.uploaded
- comment.created
- workflow.instance.started
