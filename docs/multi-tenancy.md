# Multi-Tenancy Architecture

People Hub employs a **Shared Schema & Database** architecture where tenant-scoped tables are logically isolated using a `tenant_id` foreign key referencing the `Tenant` table.

## Automated Isolation Layer

To prevent developers from forgetting to append `where: { tenantId }` filters on database operations, a custom **Prisma Client Extension** intercepts all queries:

```typescript
// Enforced inside PrismaService
this.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const tenantId = TenantContext.getTenantId();
        if (tenantId && tenantScopedModels.includes(model)) {
          args.where = args.where || {};
          args.where.tenantId = tenantId;
        }
        return query(args);
      }
    }
  }
});
```

The active `tenantId` is set inside Node's `AsyncLocalStorage` for the lifetime of each request by `TenantMiddleware` (reading from the `x-tenant-id` header or JWT payload).
This ensures tenant isolation automatically.
