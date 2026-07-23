# Occupancy Permit Departmental Mirror Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `OCCUPANCY_PERMIT` use the exact Building Permit departmental lifecycle while preserving the correct permit identity and Citizen route.

**Architecture:** Introduce a small pure permit-identity module that classifies Building and Occupancy permits as members of the existing engineering-permit workflow and returns the correct label/route. Replace Building-only workflow gates with the shared classifier, expand database filters to include both codes, and make shared screens type-aware without changing status transitions or payload structures.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma, Node.js test runner, ESLint

## Global Constraints

- The Building Permit implementation is the canonical workflow.
- Do not create new statuses, roles, admin routes, or departmental screens.
- Do not modify anything under `app/user/services/occupancy`.
- Do not alter unrelated Business Permit, Cedula, or Civil Registry behavior.
- Building Permit must retain its existing label and `/user/services/building-permit` route.
- Occupancy Permit must use its label and `/user/services/occupancy2` route.

---

### Task 1: Define the engineering-permit workflow contract

**Files:**
- Create: `lib/transactions/engineering-permit.ts`
- Create: `tests/occupancy-permit-departmental-flow.test.mjs`

**Interfaces:**
- Produces: `isEngineeringPermitCode(code)`, `getEngineeringPermitLabel(code)`, and `getEngineeringPermitCitizenRoute(code)`.
- Consumes: nullable transaction-type codes.

- [ ] **Step 1: Write failing source and behavior contract tests**

Create tests that require both codes to be classified as engineering permits, require distinct labels/routes, and scan the critical server/client files for explicit Occupancy Permit workflow support. Assert that the legacy `/occupancy` route is never used by the new routing logic.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/occupancy-permit-departmental-flow.test.mjs`

Expected: FAIL because the shared module and downstream support do not exist.

- [ ] **Step 3: Implement the identity module**

Implement null-safe helpers using the existing `startsWith` semantics for `BUILDING_PERMIT` and `OCCUPANCY_PERMIT`. Labels must be “Building Permit” and “Occupancy Permit”; routes must be `/user/services/building-permit` and `/user/services/occupancy2`.

- [ ] **Step 4: Run the helper portion and verify GREEN**

Run the focused test. Expected: helper assertions pass while downstream assertions remain RED.

### Task 2: Mirror server-side authorization, evaluation, dashboards, and BFP

**Files:**
- Modify: `app/admin/transactions/actions.ts`
- Modify: `app/admin/transactions/cedula-actions.ts`
- Modify: `app/api/cron/cleanup-appointments/route.ts`
- Test: `tests/occupancy-permit-departmental-flow.test.mjs`

**Interfaces:**
- Consumes: `isEngineeringPermitCode` and the two permit-code prefixes.
- Produces: identical role authorization, evaluation eligibility, fiscal behavior, rejection policies, Engineer/Zoning dashboard records/counts, BFP records/counts, Treasury aggregation behavior, and cleanup categorization for both permit types.

- [ ] **Step 1: Expand runtime code gates**

Replace Building-only workflow booleans with the shared engineering-permit classifier while leaving variable behavior and status transitions unchanged.

- [ ] **Step 2: Expand Prisma filters**

For Engineer/Zoning/BFP queries and counts, replace single Building code filters with `OR`/`in` filters that include both permit types. Preserve all existing status, endorsement, cancellation, and role-specific clauses.

- [ ] **Step 3: Preserve type-specific rejection grouping**

Apply the same Building Permit rejection-limit behavior independently to Occupancy Permit by grouping against the current transaction’s exact type code rather than combining both services.

- [ ] **Step 4: Run focused tests**

Expected: server-side departmental assertions pass.

### Task 3: Mirror shared admin screens and departmental navigation

**Files:**
- Modify: `app/admin/zoning/[id]/page.tsx`
- Modify: `app/admin/engineer/[id]/page.tsx`
- Modify: `app/admin/treasury/[id]/page.tsx`
- Modify: `app/admin/registrar/[id]/page.tsx`
- Modify: `app/admin/treasury/TreasuryDashboard.tsx`
- Modify relevant shared Engineer, Zoning, and BFP phase pages containing permit-identity copy.
- Test: `tests/occupancy-permit-departmental-flow.test.mjs`

**Interfaces:**
- Consumes: engineering-permit classifier/label.
- Produces: the same Building Permit phase routing and controls for Occupancy Permit, with transaction-aware permit labels and e-copy wording.

- [ ] **Step 1: Expand phase-routing gates**

Use the shared classifier anywhere Building Permit status determines Engineer/Zoning phase navigation or read/write access.

- [ ] **Step 2: Make shared permit identity copy dynamic**

Derive the permit label from the transaction type for headings, status messages, fee labels, toast messages, and e-copy labels. Do not replace generic statutory or construction terms.

- [ ] **Step 3: Expand Treasury dashboard filtering**

Apply Building Permit’s allowed-status visibility rules to Occupancy Permit without changing other transaction types.

- [ ] **Step 4: Run focused tests**

Expected: admin UI and navigation assertions pass.

### Task 4: Mirror Citizen payment behavior and correct redirects

**Files:**
- Modify: `app/user/services/requests/[id]/page.tsx`
- Modify: `app/user/services/requests/page.tsx`
- Modify: `app/user/appointment/page.tsx`
- Modify: `app/user/appointment/[id]/page.tsx`
- Modify: `app/user/reports/page.tsx`
- Test: `tests/occupancy-permit-departmental-flow.test.mjs`

**Interfaces:**
- Consumes: engineering-permit classifier and Citizen-route helper.
- Produces: identical payment/actionability/status presentation plus type-correct service redirects.

- [ ] **Step 1: Expand payment/status gates**

Use the engineering-permit classifier for Building Permit fiscal-snapshot waiting states, payment eligibility, and shared detail rendering.

- [ ] **Step 2: Add type-correct routing**

Route Building Permit to `/user/services/building-permit` and Occupancy Permit to `/user/services/occupancy2` from request, appointment, and report lists.

- [ ] **Step 3: Run focused tests and verify GREEN**

Expected: all departmental-flow contract tests pass.

### Task 5: Full verification and scope audit

**Files:**
- Verify all files changed by Tasks 1–4.

**Interfaces:**
- Produces: evidence that both permit identities share one lifecycle without changing `/occupancy`.

- [ ] **Step 1: Run focused regression tests**

Run: `node --test tests/occupancy-permit-departmental-flow.test.mjs tests/occupancy2-building-permit-mirror.test.mjs tests/building-permit-batch-upload.test.mjs tests/building-permit-upload-usage.test.mjs`

Expected: all tests PASS.

- [ ] **Step 2: Run ESLint on every changed source and test file**

Expected: exit code 0.

- [ ] **Step 3: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 4: Audit scope and diff**

Run `git diff --check`, inspect changed-file names, and confirm no file under `app/user/services/occupancy` changed. Confirm Building Permit remains accepted in every modified gate and retains its original route/label.

- [ ] **Step 5: Commit scoped implementation**

Commit the test, identity helper, and downstream files without staging unrelated workspace changes.
