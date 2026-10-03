# Authentication Architecture

People Hub authentication is built on top of **JWT Access Tokens** and **Database-stored Refresh Tokens**.

## Token Details

* **Access Token**: Short-lived (15 minutes), containing the user ID, email, active tenant ID, roles, and permission codes for that active tenant.
* **Refresh Token**: Long-lived (7 days), stored in the PostgreSQL database (revocable) to exchange for new access tokens.

## Tenant Switcher Flow

1. Authenticated user selects a new tenant from the list of memberships returned at login.
2. Next.js triggers `POST /api/v1/auth/switch-tenant` with target `tenantId`.
3. Backend resolves user's roles, scopes, and permissions for the target tenant, generating new Access/Refresh tokens reflecting the switched context.
4. Next.js updates local state and updates menus dynamically.
