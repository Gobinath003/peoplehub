# People Hub - Multi-Tenant HRMS SaaS Foundation

People Hub is a production-ready, multi-tenant, multi-industry Human Resource Management System (HRMS) SaaS product. It is built as a **Modular Monolith** using TypeScript.

---

## System Architecture

```text
                       People Hub Monorepo
                                │
                         REST API Backend
                                │
               ┌────────────────┴────────────────┐
               │                                 │
         Web Application                 Mobile Application
       Next.js / React / TS             Future Flutter App
```

### Technology Stack

* **Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript
* **Backend:** NestJS, TypeScript, REST API, Swagger/OpenAPI
* **Database:** PostgreSQL (with Prisma ORM)
* **Caching & Queue:** Redis (with BullMQ)
* **Storage:** S3-compatible object storage (MinIO for development)
* **Authentication:** JWT (Short-lived Access + long-lived Refresh tokens) + Multi-role RBAC + Data Scopes

---

## Monorepo Workspace Structure

```text
E:\Projects\PeopleHub/
├── apps/
│   ├── web/                     # Next.js web application
│   └── api/                     # NestJS API application
│
├── packages/
│   ├── shared-types/            # Shared TypeScript contracts & DTO interfaces
│
├── infrastructure/              # Deployment & infrastructure scripts
├── docs/                        # Architectural specifications
├── docker-compose.yml           # Database, Redis, and Object Storage services
├── tsconfig.json                # Shared root TS compiler options
└── package.json                 # Workspace configurations
```

---

## Local Development Setup

### 1. Requirements

Ensure you have the following installed:
* Node.js v20+
* npm v10+
* Docker & Docker Compose

### 2. Configure Environment

Copy `.env.example` to `.env` in the root:
```bash
cp .env.example .env
```

### 3. Spin Up Infrastructure

Start the local database (PostgreSQL), cache (Redis), and storage (MinIO):
```bash
docker-compose up -d
```

### 4. Install Dependencies

Install all monorepo dependencies:
```bash
npm install
```

### 5. Run Database Migrations

Generate Prisma Client and deploy schema migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 6. Start Development Servers

Run NestJS backend and Next.js frontend concurrently:
```bash
npm run dev
```

* **Web UI Dashboard:** `http://localhost:3000`
* **REST API:** `http://localhost:3001/api/v1`
* **Swagger Documentation:** `http://localhost:3001/api/docs`

---

## Architecture Specifications

See the detailed document guides in the [docs/](file:///E:/Projects/PeopleHub/docs) folder for specific features:
* **[Architecture Specifications Overview](file:///E:/Projects/PeopleHub/docs/architecture.md)**
* **[Folder Structure Breakdown](file:///E:/Projects/PeopleHub/docs/folder-structure.md)**
* **[Multi-Tenancy & Isolation](file:///E:/Projects/PeopleHub/docs/multi-tenancy.md)**
* **[Authentication Workflows](file:///E:/Projects/PeopleHub/docs/authentication.md)**
* **[Authorization (RBAC + Scope)](file:///E:/Projects/PeopleHub/docs/authorization.md)**
* **[Module Activation System](file:///E:/Projects/PeopleHub/docs/module-system.md)**
* **[Database Design](file:///E:/Projects/PeopleHub/docs/database.md)**
* **[API Contract Specifications](file:///E:/Projects/PeopleHub/docs/api.md)**
* **[Development Guide](file:///E:/Projects/PeopleHub/docs/development-guide.md)**
* **[Roadmap](file:///E:/Projects/PeopleHub/docs/roadmap.md)**
