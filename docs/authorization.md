# Authorization (RBAC + Scope)

Authorization in People Hub evaluates:
`Tenant + User + Role(s) + Permission(s) + Scope + Enabled Modules`

## Scopes & Assignments

A user can hold multiple roles, each bounded to a specific data scope limit:

```text
user_role_assignments
  id
  user_id
  role_id
  tenant_id
  scope_type      # TENANT, COMPANY, BRANCH, DEPARTMENT, OWN
  scope_id        # identifier targets (e.g. branch ID)
```

## Permission Guard Execution

The `PermissionGuard` intercepts API calls requiring permission decorators:
1. Verifies the user JWT payload possesses the required action code.
2. Checks the query/path parameters for target resource identifiers (e.g. `branchId`).
3. Ensures the user's role scope matches or covers the target. For example, a branch manager assigned Chennai scope cannot query details matching branch ID "Mumbai".
