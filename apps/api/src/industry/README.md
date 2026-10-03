# Industry Extensions Directory

This folder is designed to isolate industry-specific modules and business logic from the Common HRMS Core.

## Directory Structure

* `/garments` - Garment manufacturing specific modules (e.g. Piece Rate tracking, Line management)
* `/manufacturing` - General heavy industry / manufacturing extensions (e.g. Workers allocation, contractor roster)
* `/labour` - Labour-intensive business rules (e.g. Muster Roll, OT wage structure)
* `/consultancy` - Professional services (e.g. Timesheets, project codes, resource utilization)
* `/logistics` - Transportation / supply chain (e.g. Driver management, trip allocations)

## Guidelines

1. Core entities (like `Tenant`, `User`, `Employee`) must not contain industry-specific columns or hooks directly.
2. Add tables to the database that reference the core entities using foreign keys. For example, a `PieceRateTask` table can reference the `Employee` table.
3. Keep controllers and services in these subfolders, loading them dynamically based on active tenant modules.
