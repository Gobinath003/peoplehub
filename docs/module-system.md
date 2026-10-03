# SaaS Module System

People Hub features a dynamic module activation system. Tenants can enable/disable modules according to their business model or billing tier.

## Backend Access Control

1. Endpoints check module states. If a tenant disables the `PAYROLL` module, any API requests matching `/api/v1/payroll/*` fail immediately with a `403 Forbidden` response.
2. Dynamic guards check active modules:

```typescript
// Enforced in controllers
@UseGuards(ModuleActiveGuard('PAYROLL'))
```

## Frontend Display

The Next.js navigation menus are generated dynamically:
1. The login/refresh token returns `enabledModules` for the active organization.
2. The sidebar reads this array and filters out deactivated categories automatically, preventing users from seeing tabs they have no active subscription for.
