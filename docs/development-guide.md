# Development Guide

This guide is for developers extending the codebase.

## Creating a new Core Module

1. Define database tables in `apps/api/prisma/schema.prisma` containing `tenantId` field to ensure auto-isolation:
   ```prisma
   model LeaveRequest {
     id       String @id @default(uuid()) @db.Uuid
     tenantId String @map("tenant_id") @db.Uuid
     // ...
   }
   ```
2. Add new model to `tenantScopedModels` array inside `PrismaService` to enable automatic row isolation filter.
3. Define shared models/DTOs inside `packages/shared-types`.
4. Create NestJS service, controller, and module. Apply permissions guards.

## Creating an Industry Extension

1. Place codebase files inside `apps/api/src/industry/[industry-name]/`.
2. Do not write direct references inside the core database migrations. Run standalone tables linking via foreign keys.
3. Toggles features under the `TenantModule` system.
