# Keycloak and Tnvios Identity Boundary

## Purpose
This document defines exactly what Keycloak manages versus what Tnvios manages.

## Golden Rule

Keycloak authenticates users.

Tnvios authorizes business actions.

A valid Keycloak token proves identity only. It does not prove tenant access, organization membership, module permission, workflow authority, record access, field access, or AI authorization.

## Keycloak Owns

Keycloak manages:
- credential storage
- password hashing
- password policies
- password reset
- login flows
- email verification
- OAuth2
- OpenID Connect
- SAML SSO
- external identity providers
- MFA enrollment
- MFA enforcement
- passkeys/WebAuthn where enabled
- sessions
- access tokens
- refresh tokens
- ID tokens
- token signing keys
- token revocation
- brute-force protection
- account lockout

Keycloak may store:
- keycloak user ID
- email
- username
- first name
- last name
- email verified state
- enabled/disabled state
- authentication metadata

## Keycloak Does Not Own

Keycloak must not own:
- tenants
- organizations
- business units
- departments
- teams
- memberships
- employees
- customers
- vendors
- partners
- business roles
- module permissions
- workflow approval rights
- field-level permissions
- record-level permissions
- AI permissions
- audit decisions

## Tnvios Owns

Tnvios manages:
- shadow user records
- user profiles
- tenants
- groups
- organizations
- business units
- departments
- teams
- memberships
- roles
- permissions
- role assignments
- policies
- authorization logs
- audit logs
- workflow rights
- module access
- AI tool access

## Token Rules

Tnvios may read these claims:
```json
{
  "sub": "keycloak-user-id",
  "email": "user@example.com",
  "email_verified": true,
  "preferred_username": "user@example.com"
}
```

Tnvios must not treat Keycloak realm roles as final business permissions.

## Sync Mechanism

Required flow:

```text
Keycloak event
↓
Keycloak Event Listener / webhook bridge
↓
POST /internal/v1/identity/keycloak/events
↓
Tnvios verifies signature
↓
Tnvios creates/updates shadow user
↓
Tnvios writes audit log
↓
Tnvios publishes identity event
↓
Downstream engines react
```

## Event Mapping

```text
Keycloak REGISTER / CREATE_USER
→ identity.user.created

Keycloak UPDATE_PROFILE / UPDATE_EMAIL
→ identity.user.updated

Keycloak VERIFY_EMAIL
→ identity.user.email_verified

Keycloak DELETE_USER / DISABLE_USER
→ identity.user.deactivated

Keycloak LOGIN
→ identity.user.logged_in

Keycloak LOGOUT
→ identity.user.logged_out

Keycloak RESET_PASSWORD
→ identity.user.password_reset

Keycloak MFA_SETUP / UPDATE_CREDENTIAL
→ identity.user.mfa_updated
```

## First Login Provisioning

If Keycloak login succeeds but Tnvios user does not exist:

```text
validate token
create shadow user with status=pending
publish identity.user.created
deny business access until membership exists
```

No membership means no access.

## Request Authorization Flow

```text
Validate Keycloak JWT
↓
Resolve Tnvios user by keycloak_user_id
↓
Validate user status
↓
Resolve tenant
↓
Resolve organization
↓
Validate membership
↓
Evaluate roles
↓
Evaluate permissions
↓
Evaluate policies
↓
Evaluate record/field access
↓
Write authorization log
↓
Allow or deny
```

## Business Role Rule

Forbidden Keycloak business roles:
```text
finance.manager
crm.sales_rep
hr.admin
invoice.approve
employee.salary.view
```

These belong in Tnvios.

## Audit Split

Keycloak logs:
- login
- logout
- login failure
- password reset
- MFA changes
- token events

Tnvios logs:
- membership changes
- role assignments
- permission decisions
- business mutations
- workflow actions
- exports
- downloads
- AI actions
