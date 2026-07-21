# Simplify Engineer Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove revision UI from the Engineer Inspection/Reinspection phases and hide queue/appointment configuration controls from Engineer users.

**Architecture:** Make narrow presentation-layer changes in the four existing React components. Add a dependency-free Node source regression test so the absent controls and role configuration remain protected without introducing a test framework.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node.js built-in test runner, ESLint

## Global Constraints

- Revision removal applies only to `app/admin/engineer/[id]/inspection/page.tsx` and `app/admin/engineer/[id]/reinspection/page.tsx`.
- Preserve reinspection count and all non-revision workflow actions.
- Hide `Set Counter` and `Appointment Setting` only for the `ENGINEER` role.
- Do not modify server actions, appointment-setting pages, or behavior for other roles.

---

### Task 1: Engineer inspection revision UI

**Files:**
- Create: `tests/engineer-controls.test.mjs`
- Modify: `app/admin/engineer/[id]/inspection/page.tsx`
- Modify: `app/admin/engineer/[id]/reinspection/page.tsx`

**Interfaces:**
- Consumes: The existing page source and Node's `node:test`, `node:assert/strict`, and `node:fs` APIs.
- Produces: Both pages without revision badges, dialogs, imports, state, or handlers; `tests/engineer-controls.test.mjs` as the regression suite.

- [ ] **Step 1: Write the failing source regression test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pages = [
  "app/admin/engineer/[id]/inspection/page.tsx",
  "app/admin/engineer/[id]/reinspection/page.tsx",
];

test("Engineer inspection phases do not expose revision controls", () => {
  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.doesNotMatch(source, /Revision Count:/);
    assert.doesNotMatch(source, /Request Revision/);
    assert.doesNotMatch(source, /sendForRevision/);
    assert.doesNotMatch(source, /isRequestingRevision/);
    assert.doesNotMatch(source, /handleRequestRevision/);
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/engineer-controls.test.mjs`

Expected: FAIL on `Revision Count:` in the Inspection page.

- [ ] **Step 3: Remove the revision-only page code**

In both pages, remove `sendForRevision` from the transaction-action import, the `isRequestingRevision` state, `handleRequestRevision`, the `Revision Count` badge, and the entire `Dialog` whose trigger reads `Request Revision`. Then remove imports used only by that dialog, while retaining the reinspection count and remaining action buttons.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test tests/engineer-controls.test.mjs`

Expected: PASS for `Engineer inspection phases do not expose revision controls`.

- [ ] **Step 5: Commit the phase cleanup**

```bash
git add tests/engineer-controls.test.mjs app/admin/engineer/[id]/inspection/page.tsx app/admin/engineer/[id]/reinspection/page.tsx
git commit -m "fix: remove engineer inspection revision controls"
```

### Task 2: Engineer navigation and counter controls

**Files:**
- Modify: `tests/engineer-controls.test.mjs`
- Modify: `components/admin/CounterSelectorHeader.tsx`
- Modify: `app/admin/components/Sidebar.tsx`

**Interfaces:**
- Consumes: `allowedRoles` in `CounterSelectorHeader.tsx` and the `role === "ENGINEER"` menu branch in `Sidebar.tsx`.
- Produces: Engineer users without the counter selector or appointment-setting menu; unchanged controls for other roles.

- [ ] **Step 1: Add failing role-specific assertions**

```js
test("Engineer role does not receive counter or appointment configuration controls", () => {
  const counter = readFileSync("components/admin/CounterSelectorHeader.tsx", "utf8");
  const sidebar = readFileSync("app/admin/components/Sidebar.tsx", "utf8");
  const allowedRoles = counter.match(/const allowedRoles = \[([^\]]+)\]/s)?.[1] ?? "";
  const engineerMenu = sidebar.match(/else if \(role === "ENGINEER"\) \{([\s\S]*?)\n\s*\} else if \(role === "MPDC_ZONING"\)/)?.[1] ?? "";

  assert.doesNotMatch(allowedRoles, /"ENGINEER"/);
  assert.doesNotMatch(engineerMenu, /appointment-setting|Appointment Setting/);
  assert.match(engineerMenu, /Engineer Hub/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/engineer-controls.test.mjs`

Expected: FAIL because `allowedRoles` and the Engineer menu still contain the targeted controls.

- [ ] **Step 3: Apply the minimal role changes**

Change the counter role list to:

```ts
const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "MPDC_ZONING"];
```

Change the Engineer menu branch to:

```ts
} else if (role === "ENGINEER") {
    menuItems = [
        { href: "/admin/engineer", label: "Engineer Hub", icon: HardHat, category: "Engineering" }
    ];
```

- [ ] **Step 4: Run regression and static verification**

Run: `node --test tests/engineer-controls.test.mjs`

Expected: 2 tests PASS.

Run: `npx eslint "app/admin/engineer/[id]/inspection/page.tsx" "app/admin/engineer/[id]/reinspection/page.tsx" "components/admin/CounterSelectorHeader.tsx" "app/admin/components/Sidebar.tsx" "tests/engineer-controls.test.mjs"`

Expected: exit code 0 with no new errors.

- [ ] **Step 5: Commit the role UI cleanup**

```bash
git add tests/engineer-controls.test.mjs components/admin/CounterSelectorHeader.tsx app/admin/components/Sidebar.tsx
git commit -m "fix: hide configuration controls from engineers"
```
