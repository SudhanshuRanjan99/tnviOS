# Tnvios Onboarding and Help Engine

## Purpose
Tnvios must include onboarding flow, contextual guidance, guided tours, and in-app help.

## Onboarding Engine

Supports:
- organization onboarding
- admin onboarding
- employee onboarding
- customer onboarding
- vendor onboarding
- partner onboarding
- module onboarding
- feature onboarding

## Onboarding Flow Example

```text
create tenant
↓
verify email
↓
enable MFA
↓
create organization
↓
create business units
↓
create departments
↓
invite users
↓
assign roles
↓
install modules
↓
configure workflows
↓
complete setup
```

## Onboarding Tables
- onboarding_flows
- onboarding_steps
- onboarding_progress
- onboarding_checklists

## Help & Guidance Engine

Supports:
- contextual help
- guided tours
- tooltips
- empty state guidance
- help articles
- AI help assistant
- module-specific help
- role-specific help

## Contextual Help
Help must be resolved by:
- module
- page
- user role
- permission
- entity type
- workflow state

Example:
- Finance Manager on invoice approval page sees approval policy help.
- Customer on invoice page sees payment instructions.
- Admin on roles page sees permission/scope explanation.

## Help Content Tables
- help_articles
- help_contexts
- help_tours
- help_tour_steps
- user_help_progress

## Events
```text
onboarding.flow.started
onboarding.step.completed
onboarding.flow.completed
help.tour.started
help.tour.completed
```

## AI Help Assistant
AI help may:
- explain current page
- answer “what can I do here?”
- suggest next setup steps
- explain permission errors

AI help must:
- obey permissions
- not expose restricted docs
- cite internal help source where possible
