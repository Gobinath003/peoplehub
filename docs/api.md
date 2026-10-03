# API Contract Specifications

All API routes follow a structured, versioned REST layout:

## Authentication Endpoints (`/api/v1/auth`)

* `POST /register`: Registers a new user account.
* `POST /login`: Validates user and returns available tenant memberships.
* `POST /refresh`: Uses refresh token to rotate access/refresh pairs.
* `POST /switch-tenant`: Swaps token contexts.
* `POST /create-tenant`: Hooks up new organization profile under the user.

## Tenant Settings (`/api/v1/tenants`)

* `GET /active`: Return details of active organization.
* `GET /modules`: List state of registered modules.
* `POST /modules/:code`: Activate/deactivate a module code.

## User Management & RBAC (`/api/v1/users`)

* `GET /`: Lists all tenant-enrolled user profiles.
* `GET /:userId/roles`: Query role scopes matching a user.
* `POST /:userId/roles`: Assign a role scoped to branch/department.
* `DELETE /roles/:assignmentId`: Delete role assignment.

## System Audits (`/api/v1/audit-logs`)

* `GET /`: Retrieve immutable logs trace.
