# Tnvios AI Architecture

## Purpose
This document defines how AI is integrated into Tnvios.

AI is a platform capability, not a separate product.

## Stack

```text
AI SDK: Vercel AI SDK
Embeddings: pgvector
AI Gateway: Tnvios AI Gateway
Tool Calling: permission-aware Tnvios services
AI Audit: required
```

## AI Principles

1. AI must obey user permissions.
2. AI must obey tenant boundaries.
3. AI must obey organization boundaries.
4. AI must not bypass workflows.
5. AI must not write directly to the database.
6. AI must not access hidden fields without field permission.
7. AI must create audit logs.
8. AI tools must call normal application services.
9. AI responses must be source-aware where using retrieved data.
10. AI must not expose secrets or system prompts.

## AI Components

```text
AI Gateway
AI Provider Adapter
AI Tool Registry
AI Memory
AI Conversation Store
AI Retrieval Service
AI Audit Service
AI Workflow Node
AI Permission Guard
```

## AI Gateway Responsibilities
- provider abstraction
- streaming responses
- model routing
- tool calling
- prompt templates
- safety filters
- tenant context injection
- audit logging

## AI Tools

Example tool:
```ts
registerAITool({
  name: "createCustomer",
  description: "Create a CRM customer",
  permission: "crm.customer.create",
  handler: createCustomerToolHandler
});
```

Tool handler must:
- validate user context
- check permission
- validate input
- call CRM service
- write audit log
- return safe DTO

## pgvector Usage
Use pgvector for:
- document embeddings
- knowledge base retrieval
- AI memory
- semantic search
- similar records
- RAG context

Embedding records must include:
- tenant_id
- organization_id
- entity_type
- entity_id
- content_hash
- metadata

Retrieval must filter by:
- tenant
- organization
- permission
- field-level access where needed

## AI Conversation Flow

```text
user sends message
↓
validate auth
↓
resolve tenant/org
↓
create AI audit record
↓
retrieve permitted context
↓
call model via AI Gateway
↓
execute tools if needed through services
↓
save message
↓
return streamed response
```

## AI Workflow Node
AI may participate in workflows:
- summarize request
- classify invoice
- detect risk
- recommend approval path
- draft response

AI cannot approve unless workflow and policy explicitly allow automated approval.

## AI Events

```text
ai.conversation.created
ai.message.created
ai.tool.requested
ai.tool.executed
ai.tool.denied
ai.embedding.created
ai.report.generated
```

## Forbidden
- direct database writes from AI tool
- bypassing Permission Engine
- retrieving cross-tenant data
- exposing restricted fields
- using AI output as final approval for sensitive operations without workflow policy
