# Building Permit Upload Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Building Permit submission latency by uploading independent documents with a maximum concurrency of four.

**Architecture:** Add a generic, dependency-free `mapWithConcurrency` helper and use it to process keyed upload jobs in both Building Permit submission pages. Keep the existing per-file compression, signed URL creation, Supabase PUT, server submission, validation, signature, queue, and refresh behavior intact.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase Storage signed uploads, Node test runner through `tsx`, ESLint

## Global Constraints

- Maximum active document uploads: `4`.
- Preserve document keys regardless of upload completion order.
- Any failed upload must reject before `submitBuildingPermit` or `resubmitBuildingPermit` runs.
- Do not alter Supabase bucket configuration, server-side file validation, database writes, signature persistence, appointment capacity, or queue numbering.

---

### Task 1: Controlled concurrency helper

**Files:**
- Create: `lib/async/map-with-concurrency.ts`
- Create: `tests/map-with-concurrency.test.ts`

**Interfaces:**
- Produces: `mapWithConcurrency<T, R>(items: readonly T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]>`.

- [ ] **Step 1: Write failing tests**

Test empty and ordered results, track active delayed jobs to assert the peak is `4`, and assert rejection propagates from a failed mapper.

- [ ] **Step 2: Verify RED**

Run: `npx tsx --test tests/map-with-concurrency.test.ts`

Expected: FAIL because `lib/async/map-with-concurrency.ts` does not exist.

- [ ] **Step 3: Implement the helper**

Validate that concurrency is a positive integer, return `[]` for no items, allocate a result array, and start `Math.min(concurrency, items.length)` workers sharing a next-index counter. Each worker awaits the mapper and stores the value at its input index.

- [ ] **Step 4: Verify GREEN**

Run: `npx tsx --test tests/map-with-concurrency.test.ts`

Expected: all helper tests pass.

### Task 2: Building Permit upload batches

**Files:**
- Modify: `app/user/services/building-permit/page.tsx`
- Modify: `app/user/services/building-permit-appointment/page.tsx`
- Create: `tests/building-permit-upload-usage.test.mjs`

**Interfaces:**
- Consumes: `mapWithConcurrency` from `@/lib/async/map-with-concurrency`.
- Produces: Both submit handlers execute keyed document upload jobs with concurrency `4` before constructing the unchanged `FormData` payload.

- [ ] **Step 1: Write failing source regression tests**

For both pages, assert the helper import exists, the helper is called with `4`, and the old `await uploadFileClientSide` statements no longer appear inside requirement, permit, or revision loops.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/building-permit-upload-usage.test.mjs`

Expected: FAIL because neither page imports or calls the helper.

- [ ] **Step 3: Refactor both submit handlers**

Build keyed upload jobs for newly selected ID, TCT, requirement, permit, and revision files. Preserve existing URLs directly. Execute jobs once with `mapWithConcurrency(uploadJobs, 4, ...)`, convert ordered results to the same `newIdFile`, `newIdFileBack`, `tctFile`, `req_*`, `permit_*`, and `revision_*` maps, and leave all code after `FormData` construction unchanged.

- [ ] **Step 4: Verify focused tests and static checks**

Run: `npx tsx --test tests/map-with-concurrency.test.ts`

Run: `node --test tests/building-permit-upload-usage.test.mjs`

Run: `npx eslint "lib/async/map-with-concurrency.ts" "tests/map-with-concurrency.test.ts" "tests/building-permit-upload-usage.test.mjs" "app/user/services/building-permit/page.tsx" "app/user/services/building-permit-appointment/page.tsx"`

Expected: all tests pass and ESLint exits `0`.

- [ ] **Step 5: Review the diff and commit**

Confirm only upload orchestration changed, then commit the helper, tests, pages, and this plan.
