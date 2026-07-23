# Occupancy Permit Database Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add and wire a dedicated `OccupancyPermit` table while keeping Building and Occupancy release persistence strictly separated.

**Architecture:** Mirror the `BuildingPermit` Prisma model and relate it one-to-one with `Transaction`. Extend the transaction-type initializer with an Occupancy row and branch the shared release action by transaction code, using idempotent upserts into exactly one permit table.

**Tech Stack:** Prisma 6, PostgreSQL, Next.js server actions, Node.js tests, TypeScript

## Global Constraints

- `BUILDING_PERMIT` writes only to `BuildingPermit`.
- `OCCUPANCY_PERMIT` writes only to `OccupancyPermit`.
- Preserve unrelated uncommitted schema changes.
- Preserve the shared workflow and `/user/services/occupancy` route.

### Task 1: Database and release contract

**Files:**
- Create: `tests/occupancy-permit-database-table.test.mjs`

- [ ] Assert the schema relation/model, migration SQL, transaction-type configuration, strict release branching, table-specific upserts, and BP/OP prefixes.
- [ ] Run and verify RED.

### Task 2: Prisma schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_occupancy_permit/migration.sql`

- [ ] Add `Transaction.occupancyPermit`.
- [ ] Add mirrored `OccupancyPermit`.
- [ ] Generate migration SQL with the table, unique indexes, foreign key, and cascade.
- [ ] Run Prisma format and validation.

### Task 3: Transaction type and strict release persistence

**Files:**
- Modify: `app/admin/transactions/actions.ts`
- Modify: `app/admin/actions.ts`

- [ ] Add `OCCUPANCY_PERMIT` to the permit transaction-type upsert configuration.
- [ ] Fetch transaction type in the release action.
- [ ] Branch on the exact code and upsert only the corresponding permit table.
- [ ] Use `BP-` for Building and `OP-` for Occupancy.
- [ ] Add Occupancy cleanup alongside Building cleanup.
- [ ] Run focused tests and verify GREEN.

### Task 4: Apply and verify database

- [ ] Generate Prisma Client.
- [ ] Apply the migration to the configured development database.
- [ ] Run the transaction-type upsert.
- [ ] Query PostgreSQL to verify the physical table and transaction-type row.
- [ ] Run focused tests, ESLint, TypeScript, and scope audit.
- [ ] Commit only scoped changes; do not absorb unrelated schema work.
