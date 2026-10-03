# Database Design & Schema

Prisma ORM is used with PostgreSQL to define the core database model.

## Core Schema Entities

1. **tenants**: Stores company-specific profile columns and industry extension mappings.
2. **modules** & **tenant_modules**: Toggles HRMS core features (attendance, payroll) or industry extensions (piece rate, muster roll) for each organization.
3. **users**: Global user credentials mapping emails to bcrypt hashes.
4. **tenant_users**: Link table mapping global users to corporate tenant scopes.
5. **roles** & **permissions** & **role_permissions**: Extensible RBAC configurations.
6. **user_role_assignments**: Binds users to specific tenant roles under scoped limits.
7. **refresh_tokens**: Validates authentication states.
8. **audit_logs**: Immutable trace logs.
