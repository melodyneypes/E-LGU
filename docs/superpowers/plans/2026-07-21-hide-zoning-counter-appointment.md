# Hide Zoning Counter and Appointment Setting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent Zoning identities from rendering or clicking the shared counter selector and Zoning appointment-setting sidebar entry.

**Architecture:** Add one pure identity predicate shared by the counter selector and sidebar. Both UI components will use the predicate to suppress their Zoning-only controls while leaving routes, backend behavior, and all non-Zoning identities unchanged.

**Tech Stack:** React 19, Next.js 16 App Router, TypeScript, Node test runner, ESLint

## Global Constraints

- Apply to `MPDC_ZONING` and administrative accounts whose department contains `ZONING`.
- Hide controls completely; do not render disabled placeholders.
- Do not delete or modify appointment-setting routes, APIs, database records, permissions, or Zoning Hub workflow.
- Do not modify the existing Engineer fees work or the untracked Occupancy module.

---

### Task 1: Shared Zoning identity rule

**Files:**
- Create: `lib/admin/zoning-ui-visibility.ts`
- Create: `tests/zoning-ui-visibility.test.ts`

**Interfaces:**
- Produces: `isZoningIdentity(role?: string | null, department?: string | null): boolean`
- Consumed by: `CounterSelectorHeader` and `Sidebar` in Task 2

- [ ] **Step 1: Write the failing identity tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { isZoningIdentity } from "../lib/admin/zoning-ui-visibility";

test("identifies Zoning roles and departments", () => {
  assert.equal(isZoningIdentity("MPDC_ZONING", null), true);
  assert.equal(isZoningIdentity("ADMIN", "Zoning"), true);
  assert.equal(isZoningIdentity("ADMIN", "MPDC Zoning Office"), true);
});

test("does not classify non-Zoning identities as Zoning", () => {
  assert.equal(isZoningIdentity("ENGINEER", "Engineering"), false);
  assert.equal(isZoningIdentity("TREASURY_STAFF", "Treasury"), false);
  assert.equal(isZoningIdentity("ADMIN", "LGU"), false);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx tsx --test tests/zoning-ui-visibility.test.ts`

Expected: FAIL because `lib/admin/zoning-ui-visibility.ts` does not exist.

- [ ] **Step 3: Implement the pure predicate**

```ts
export function isZoningIdentity(
  role?: string | null,
  department?: string | null
): boolean {
  return role === "MPDC_ZONING" || department?.toUpperCase().includes("ZONING") === true;
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npx tsx --test tests/zoning-ui-visibility.test.ts`

Expected: 2 tests PASS.

### Task 2: Hide both Zoning UI controls

**Files:**
- Modify: `components/admin/CounterSelectorHeader.tsx`
- Modify: `app/admin/components/Sidebar.tsx`
- Create: `tests/zoning-ui-usage.test.mjs`

**Interfaces:**
- Consumes: `isZoningIdentity(role, department): boolean` from Task 1
- Counter output: `null` for Zoning identities
- Sidebar output: menu list without `/admin/zoning/appointment-setting` for Zoning identities

- [ ] **Step 1: Write the failing source integration test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Zoning identities cannot render the counter selector", () => {
  const source = readFileSync("components/admin/CounterSelectorHeader.tsx", "utf8");
  assert.match(source, /isZoningIdentity\(userRole, userDepartment\)/);
  assert.match(source, /if \(isZoning\) return null/);
});

test("Zoning identities cannot receive the appointment-setting menu item", () => {
  const source = readFileSync("app/admin/components/Sidebar.tsx", "utf8");
  assert.match(source, /isZoningIdentity\(role, department\)/);
  assert.match(source, /item\.href !== "\/admin\/zoning\/appointment-setting"/);
});
```

- [ ] **Step 2: Run the integration test and verify RED**

Run: `node --test tests/zoning-ui-usage.test.mjs`

Expected: FAIL because neither UI component uses the shared predicate.

- [ ] **Step 3: Exclude Zoning from the counter selector**

Import `isZoningIdentity`, remove `MPDC_ZONING` from `allowedRoles`, remove Zoning names from `allowedDepartments`, and declare `const isZoning = isZoningIdentity(userRole, userDepartment);`. Before the existing `if (!isAuthorized) return null;`, add:

```ts
if (isZoning) return null;
```

This also prevents the counter prompt dialog from rendering.

- [ ] **Step 4: Remove the Zoning appointment item from the sidebar**

Import `isZoningIdentity`. Change the specialized `MPDC_ZONING` array to contain only `Zoning Hub`. After all role and accessible-page menu construction, add a final Zoning-only filter:

```ts
if (isZoningIdentity(role, department)) {
  menuItems = menuItems.filter(
    item => item.href !== "/admin/zoning/appointment-setting"
  );
}
```

Placing the filter after accessible-page processing prevents a custom page assignment from restoring the hidden entry.

- [ ] **Step 5: Run all focused tests and verify GREEN**

Run: `npx tsx --test tests/zoning-ui-visibility.test.ts`

Expected: 2 tests PASS.

Run: `node --test tests/zoning-ui-usage.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 6: Commit the tested implementation**

```bash
git add lib/admin/zoning-ui-visibility.ts components/admin/CounterSelectorHeader.tsx app/admin/components/Sidebar.tsx tests/zoning-ui-visibility.test.ts tests/zoning-ui-usage.test.mjs
git commit -m "fix: hide zoning counter and appointment controls"
```

### Task 3: Verification

**Files:**
- Verify only; no expected production edits

**Interfaces:**
- Consumes all outputs from Tasks 1-2
- Produces final test, lint, type-check, and scope evidence

- [ ] **Step 1: Run focused regression tests**

Run: `npx tsx --test tests/zoning-ui-visibility.test.ts`

Expected: 2 tests PASS.

Run: `node --test tests/zoning-ui-usage.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 2: Run lint**

Run: `npx eslint lib/admin/zoning-ui-visibility.ts components/admin/CounterSelectorHeader.tsx app/admin/components/Sidebar.tsx tests/zoning-ui-visibility.test.ts tests/zoning-ui-usage.test.mjs`

Expected: exit code 0.

- [ ] **Step 3: Run TypeScript checking**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 4: Confirm final scope**

Run: `git status --short`

Expected: the pre-existing modified `app/admin/engineer/[id]/fees/page.tsx` and untracked `app/user/services/occupancy/` remain untouched and outside the Zoning commit.
