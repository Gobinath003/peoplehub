# Workspace Folder Structure

Here is a guide to the workspace files and folder organization:

```text
E:\Projects\PeopleHub/
├── apps/
│   ├── web/                    # Next.js frontend application
│   │   ├── src/app/            # App Router pages and layouts
│   │   └── src/context/        # Authentication and tenant context hooks
│   └── api/                    # NestJS API application
│       ├── src/auth/           # JWT, login/register logic, RBAC Guards & Decorators
│       ├── src/tenants/        # Active tenant and feature flag modules
│       ├── src/users/          # Users management and scoped role assignments
│       ├── src/audit/          # API endpoint activity monitoring interceptors
│       ├── src/prisma/         # Database service with multi-tenant logical filters
│       └── prisma/             # Schema definitions and migrations
│
├── packages/
│   └── shared-types/           # Shared TypeScript interfaces & DTO definitions
│
├── docs/                       # Architecture documentation guides
└── docker-compose.yml          # Containerized dev infrastructure
```
