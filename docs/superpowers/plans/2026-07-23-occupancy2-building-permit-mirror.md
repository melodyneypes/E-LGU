# Occupancy2 Building Permit Mirror Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/user/services/occupancy2` as an independent Occupancy Permit version of the current Building Permit user service.

**Architecture:** Clone the Building Permit client page and colocated server actions so behavior and layout remain identical. Apply only the terminology, action-identifier, transaction-code, route, upload namespace, and toast-ID substitutions defined by the approved design, protected by source-level regression tests.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma, Node.js test runner, ESLint

## Global Constraints

- Do not modify any file under `app/user/services/occupancy`.
- Do not modify service-card links or navigation outside `/occupancy2`.
- Do not alter the Building Permit source files.
- Use transaction code `OCCUPANCY_PERMIT`, route `/user/services/occupancy2`, and storage prefix `occupancy-permits/`.
- Preserve the source flow, fields, validation, statuses, uploads, payment, cancellation, revision, and resubmission logic.

---

### Task 1: Occupancy2 mirror contract test

**Files:**
- Create: `tests/occupancy2-building-permit-mirror.test.mjs`
- Test: `tests/occupancy2-building-permit-mirror.test.mjs`

**Interfaces:**
- Consumes: Building Permit source files as the canonical mirror and the required Occupancy2 paths.
- Produces: Regression assertions for files, renamed exports, runtime namespaces, user-facing wording, and upload concurrency.

- [ ] **Step 1: Write the failing mirror test**

Create a Node test that reads both source/target pairs, asserts the target files exist, verifies exports `submitOccupancyPermit`, `getExistingOccupancyPermits`, `resubmitOccupancyPermit`, and `submitOccupancyPermitPaymentProof`, verifies `OCCUPANCY_PERMIT`, `/user/services/occupancy2`, `occupancy-permits/`, `getSecureUploadUrlsAction(uploadRequests, "occupancy_permits")`, and `mapWithConcurrency(uploadJobs, 4, ...)`, and rejects Building Permit-specific action names, code, route, storage prefix, and user-facing phrases in the target.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/occupancy2-building-permit-mirror.test.mjs`

Expected: FAIL because `app/user/services/occupancy2/page.tsx` and `actions.ts` do not exist.

- [ ] **Step 3: Commit the red test**

Run: `git add tests/occupancy2-building-permit-mirror.test.mjs && git commit -m "test: define occupancy2 mirror contract"`

Expected: only the new test is committed.

### Task 2: Mirrored server actions

**Files:**
- Create: `app/user/services/occupancy2/actions.ts`
- Test: `tests/occupancy2-building-permit-mirror.test.mjs`

**Interfaces:**
- Consumes: `FormData`, authenticated user session, Prisma transaction APIs, shared storage validation/upload helpers, and transaction type `OCCUPANCY_PERMIT`.
- Produces: `submitOccupancyPermit`, `saveTransactionSignature`, `getExistingOccupancyPermits`, `resubmitOccupancyPermit`, `submitOccupancyPermitPaymentProof`, `submitClearancesForReviewAction`, `checkActivePropertyPermit`, and `getBarangaysAction`.

- [ ] **Step 1: Copy the canonical server-action implementation**

Copy `app/user/services/building-permit/actions.ts` to `app/user/services/occupancy2/actions.ts` without modifying the source.

- [ ] **Step 2: Apply the exact action substitutions**

Rename the four Building Permit-specific exported actions and their internal messages; replace `BUILDING_PERMIT` with `OCCUPANCY_PERMIT`, `building-permits/` with `occupancy-permits/`, and `/user/services/building-permit` with `/user/services/occupancy2`. Keep shared action names and all transaction/status logic unchanged.

- [ ] **Step 3: Run the focused test**

Run: `node --test tests/occupancy2-building-permit-mirror.test.mjs`

Expected: still FAIL only because the target page is missing.

### Task 3: Mirrored client page

**Files:**
- Create: `app/user/services/occupancy2/page.tsx`
- Test: `tests/occupancy2-building-permit-mirror.test.mjs`

**Interfaces:**
- Consumes: the Task 2 server-action exports and the same shared UI, auth, upload, compression, and transaction dependencies used by Building Permit.
- Produces: the `/user/services/occupancy2` page with the complete mirrored wizard and Occupancy Permit terminology.

- [ ] **Step 1: Copy the canonical client implementation**

Copy `app/user/services/building-permit/page.tsx` to `app/user/services/occupancy2/page.tsx` without modifying the source.

- [ ] **Step 2: Apply exact client substitutions**

Rename imported/called Building Permit-specific actions and `BuildingPermitPage`; replace Building Permit user-facing wording in singular/case variants with Occupancy Permit wording; replace any Building Permit route, upload namespace, and toast identifier with the Occupancy2 equivalents. Preserve generic construction/occupancy fields, JSX structure, styles, stages, validations, and status logic.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run: `node --test tests/occupancy2-building-permit-mirror.test.mjs`

Expected: PASS.

- [ ] **Step 4: Compare normalized source and mirror**

Run a read-only comparison that reverses the approved terminology mappings in the target and confirms no structural differences remain beyond those substitutions.

Expected: no unexpected differences.

### Task 4: Static verification and scope audit

**Files:**
- Verify: `app/user/services/occupancy2/page.tsx`
- Verify: `app/user/services/occupancy2/actions.ts`
- Verify: `tests/occupancy2-building-permit-mirror.test.mjs`

**Interfaces:**
- Consumes: completed mirror.
- Produces: evidence that the new route is lint-clean, type-compatible, tested, and scope-safe.

- [ ] **Step 1: Run focused and existing upload tests**

Run: `node --test tests/occupancy2-building-permit-mirror.test.mjs tests/building-permit-batch-upload.test.mjs tests/building-permit-upload-usage.test.mjs`

Expected: all tests PASS.

- [ ] **Step 2: Run ESLint on new production files and test**

Run: `npx eslint app/user/services/occupancy2/page.tsx app/user/services/occupancy2/actions.ts tests/occupancy2-building-permit-mirror.test.mjs`

Expected: exit code 0 with no new errors.

- [ ] **Step 3: Run TypeScript checking**

Run: `npx tsc --noEmit`

Expected: exit code 0, or report unrelated pre-existing failures with evidence that none point to `/occupancy2`.

- [ ] **Step 4: Audit the final diff**

Run: `git status --short`, `git diff --check`, and a path-scoped diff/stat. Confirm no file under `app/user/services/occupancy`, no service-card file, and no Building Permit source file was changed by this implementation.

- [ ] **Step 5: Commit the implementation**

Run: `git add app/user/services/occupancy2 tests/occupancy2-building-permit-mirror.test.mjs docs/superpowers/plans/2026-07-23-occupancy2-building-permit-mirror.md && git commit -m "feat: add mirrored occupancy permit service"`

Expected: the commit contains only the plan, new `/occupancy2` files, and focused test.
