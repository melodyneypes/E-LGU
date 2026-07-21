# Secure Idle Timer Render-Update Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move idle-warning and logout side effects out of the timer's functional state updater so React never receives a Router update during `SecureIdleTimer` rendering.

**Architecture:** Keep the interval responsible only for incrementing elapsed idle time. A commit-phase effect will react to thresholds and call the existing client logout helper once, guarded by a ref.

**Tech Stack:** React 19, Next.js 16 App Router, NextAuth 4, TypeScript, Node test runner, ESLint

## Global Constraints

- Preserve existing timeout and warning defaults.
- Preserve the inactivity modal, activity reset events, and warning toast copy.
- Apply through the shared component; do not modify individual service pages.
- Use `logoutToLogin()` instead of the redirecting `secureLogoutAction()`.
- Do not modify the untracked Occupancy module.

---

### Task 1: Move timer side effects to a commit-phase effect

**Files:**
- Modify: `components/shared/SecureIdleTimer.tsx`
- Create: `tests/secure-idle-timer-usage.test.mjs`

**Interfaces:**
- Consumes: `logoutToLogin(): Promise<void>` from `components/auth/logout-to-login.ts`
- Produces: one automatic logout after `idleTime >= timeoutSeconds`

- [ ] **Step 1: Write the failing source regression test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("idle counter updater is pure and logout runs after commit", () => {
  const source = readFileSync("components/shared/SecureIdleTimer.tsx", "utf8");

  assert.match(source, /import \{ logoutToLogin \} from "@\/components\/auth\/logout-to-login"/);
  assert.match(source, /setIdleTime\(prev => prev \+ 1\)/);
  assert.match(source, /hasLoggedOutRef/);
  assert.match(source, /if \(idleTime >= timeoutSeconds && !hasLoggedOutRef\.current\)/);
  assert.match(source, /void logoutToLogin\(\)/);
  assert.doesNotMatch(source, /secureLogoutAction/);
});

test("idle timer retains warning and activity reset behavior", () => {
  const source = readFileSync("components/shared/SecureIdleTimer.tsx", "utf8");

  assert.match(source, /if \(idleTime === warningSeconds\)/);
  assert.match(source, /setShowIdleModal\(true\)/);
  assert.match(source, /setIdleTime\(0\)/);
  for (const eventName of ["mousemove", "keydown", "scroll", "click"]) {
    assert.match(source, new RegExp(`addEventListener\\("${eventName}"`));
    assert.match(source, new RegExp(`removeEventListener\\("${eventName}"`));
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/secure-idle-timer-usage.test.mjs`

Expected: FAIL because the component imports `secureLogoutAction`, performs side effects inside the state updater, and has no one-time ref.

- [ ] **Step 3: Make the interval updater pure**

Replace the server-action import with:

```ts
import { logoutToLogin } from "@/components/auth/logout-to-login";
```

Declare the guard beside state:

```ts
const hasLoggedOutRef = React.useRef(false);
```

Replace the interval callback body with:

```ts
setIdleTime(prev => prev + 1);
```

- [ ] **Step 4: Add the threshold effect**

Add a separate effect after the interval/listener effect:

```ts
useEffect(() => {
  if (idleTime === warningSeconds) {
    setShowIdleModal(true);
  }

  if (idleTime >= timeoutSeconds && !hasLoggedOutRef.current) {
    hasLoggedOutRef.current = true;
    toast.warning(
      `Securely signed out due to ${Math.floor(timeoutSeconds / 60)} minutes of inactivity.`
    );
    void logoutToLogin();
  }
}, [idleTime, timeoutSeconds, warningSeconds]);
```

The existing activity reset function continues to reset `idleTime` and the modal. It does not reset `hasLoggedOutRef` after logout has begun.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test tests/secure-idle-timer-usage.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 6: Commit the tested implementation**

```bash
git add components/shared/SecureIdleTimer.tsx tests/secure-idle-timer-usage.test.mjs
git commit -m "fix: defer idle logout until after render"
```

### Task 2: Verification

**Files:**
- Verify only; no expected production edits

**Interfaces:**
- Consumes the Task 1 implementation
- Produces test, lint, type-check, and scope evidence

- [ ] **Step 1: Run focused regression tests**

Run: `node --test tests/secure-idle-timer-usage.test.mjs tests/auth-navigation-usage.test.mjs`

Expected: all tests PASS.

- [ ] **Step 2: Run lint**

Run: `npx eslint components/shared/SecureIdleTimer.tsx components/auth/logout-to-login.ts tests/secure-idle-timer-usage.test.mjs tests/auth-navigation-usage.test.mjs`

Expected: exit code 0.

- [ ] **Step 3: Run TypeScript checking**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 4: Confirm final scope**

Run: `git status --short`

Expected: only the pre-existing untracked `app/user/services/occupancy/` remains outside the committed timer fix.
