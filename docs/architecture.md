# Architecture Overview

People Hub is structured as a **Modular Monolith** to deliver the scalability benefits of microservices without the complex operational overhead during initial stages.

## Design Highlights

1. **Monorepo Structure**: Uses Node.js / npm workspaces to house the frontend, API backend, and shared libraries together.
2. **API-First Design**: The backend NestJS app exposes RESTful, versioned APIs (`/api/v1`) documented via Swagger. Next.js and future Flutter mobile clients consume these exact same endpoints.
3. **Common Core + Industry Extensions**: Industry specific modules (garments, logistics) are isolated in the `industry/` directory, extending the common Core tables without contaminating them.
4. **Logical Tenant Isolation**: A shared database schema where every tenant-owned record contains a `tenantId` field. Custom Prisma Extensions automatically inject the active tenant context into queries to prevent data leakages.
