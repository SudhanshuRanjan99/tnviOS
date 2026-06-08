# Tnvios Permission and Policy Rules

## Purpose
This document defines Tnvios authorization rules.

## Golden Rule
Access is denied unless explicitly allowed.

## Authorization Formula

```text
Authentication
+ Tenant Context
+ Organization Context
+ Membership
+ Role
+ Permission
+ Scope
+ Policy
+ Record Access
+ Field Access
+ Workflow Rules
= Access Decision
```

## Evaluation Order

```text
1. Validate authentication
2. Resolve Tnvios user
3. Validate tenant
4. Validate organization
5. Validate active membership
6. Check role permission
7. Check permission scope
8. Evaluate ABAC policies
9. Evaluate record-level security
10. Evaluate field-level security
11. Evaluate workflow requirement
12. Evaluate security requirement such as MFA
13. Write authorization log
14. Return allow/deny
```

## Permission Naming

Format:

```text
module.resource.action
```

Examples:

```text
crm.customer.read
crm.customer.create
crm.customer.update
crm.customer.delete

finance.invoice.read
finance.invoice.create
finance.invoice.submit
finance.invoice.approve
finance.invoice.export

hr.employee.read
hr.employee.create
hr.employee.salary.view

workflow.task.approve
workflow.task.reject

ai.chat.use
ai.report.generate
ai.tool.execute
```

## Scope Levels

```text
tenant
organization
business_unit
department
team
personal
record
field
```

## Role Assignment

Roles are assigned inside tenant and organization scope.

A user may have:
- different roles in different organizations
- different roles in different departments
- temporary delegated roles
- customer/vendor/partner roles

## ABAC Attributes

User attributes:
- department
- business unit
- team
- employment type
- country
- grade
- user type
- MFA status

Resource attributes:
- owner
- department
- business unit
- status
- classification
- amount
- module
- entity type

Environment attributes:
- time
- IP address
- device
- authentication method
- location

## Field-Level Security

Sensitive fields:
- salary
- tax number
- national ID
- bank account
- medical data
- payroll data
- executive notes
- restricted financial information

Any response containing sensitive fields must filter them based on field permissions.

## Record-Level Security

Examples:
- Sales users can view assigned customers only.
- Employees can view their own employee profile.
- Customers can view their own projects and invoices only.
- Vendors can view their own purchase orders only.
- Partners can view assigned opportunities only.

## Workflow Authorization

Permission alone may not be enough.

Example:
A user may have `finance.invoice.approve`, but policy may deny approval if:
- the user created the invoice
- invoice amount exceeds their approval limit
- MFA was not completed
- separation of duties applies

## AI Authorization

AI acts on behalf of the user.

If the user cannot do it, AI cannot do it.

AI tools must call Permission Engine before actions.

## Authorization Log

Every decision should log:
- user
- tenant
- organization
- permission
- resource type
- resource ID
- decision
- reason
- policies evaluated
- timestamp
- correlation ID
