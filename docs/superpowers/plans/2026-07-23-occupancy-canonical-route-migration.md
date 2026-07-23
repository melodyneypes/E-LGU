# Occupancy Canonical Route Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the user-initiated rename from `/occupancy2` to the canonical `/occupancy` route.

**Architecture:** Treat the manually moved `app/user/services/occupancy` files as Git renames of the tracked `occupancy2` files. Update the shared Citizen route helper, internal revalidation, and regression-test paths while leaving all transaction and departmental behavior unchanged.

**Tech Stack:** Next.js 16, TypeScript, Node.js test runner, Git

## Global Constraints

- Do not restore the previous modular Occupancy implementation.
- Do not create an `/occupancy2` redirect.
- Do not modify unrelated uncommitted files.
- Preserve all Occupancy Permit transaction and departmental logic.

### Task 1: Update the failing route contract

**Files:**
- Rename: `tests/occupancy2-building-permit-mirror.test.mjs` to `tests/occupancy-building-permit-mirror.test.mjs`
- Modify: `tests/occupancy-permit-departmental-flow.test.mjs`

- [ ] Rename the test and change expected production paths/routes to `/occupancy`.
- [ ] Run the tests and verify they fail because runtime sources still reference `/occupancy2`.

### Task 2: Migrate runtime routing

**Files:**
- Rename: `app/user/services/occupancy2/page.tsx` to `app/user/services/occupancy/page.tsx`
- Rename: `app/user/services/occupancy2/actions.ts` to `app/user/services/occupancy/actions.ts`
- Modify: `app/user/services/occupancy/actions.ts`
- Modify: `lib/transactions/engineering-permit.ts`

- [ ] Change both revalidation calls to `/user/services/occupancy`.
- [ ] Change the Occupancy Citizen route helper to `/user/services/occupancy`.
- [ ] Confirm the service card already points to `/user/services/occupancy`.
- [ ] Run focused tests and verify GREEN.

### Task 3: Verify and commit

- [ ] Assert that active runtime source/tests contain no `occupancy2`.
- [ ] Run focused tests, ESLint, and `npx tsc --noEmit`.
- [ ] Audit the scoped diff and confirm unrelated dirty files were not staged.
- [ ] Commit only the route migration files and tests.
