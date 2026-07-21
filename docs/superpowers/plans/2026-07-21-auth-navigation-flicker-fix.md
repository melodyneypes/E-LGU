# Auth Navigation Flicker Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Engineering logout and login navigate exactly once without exposing a raw Server Action redirect response.

**Architecture:** Centralize role destination resolution in a pure helper and client logout behavior in one NextAuth-aware helper. Both admin logout buttons call the client helper, while both existing-session and successful-login redirects use the same destination resolver.

**Tech Stack:** Next.js 16 App Router, NextAuth 4, React 19, TypeScript, Node test runner through `tsx`, ESLint

## Global Constraints

- Preserve account verification, password setup, maintenance, OTP, and lockout checks.
- Preserve the existing 1.2-second leave animation.
- Logout must clear the NextAuth session and `active_portal` cookie before one navigation to `/auth/login`.
- `ENGINEER` must resolve to `/admin/engineer`.

---

### Task 1: Auth navigation primitives

**Files:**
- Create: `lib/auth/post-login-destination.ts`
- Create: `tests/post-login-destination.test.ts`
- Create: `components/auth/logout-to-login.ts`

**Interfaces:**
- Produces: `getPostLoginDestination(user, maintenanceActive): string` and `logoutToLogin(): Promise<void>`.

- [ ] Write failing table-driven role destination tests, including Engineer, Zoning, Treasury, BPLO, Registrar, regular user, accessible-pages override, and admin fallback.
- [ ] Run `npx tsx --test tests/post-login-destination.test.ts` and verify module-not-found RED.
- [ ] Implement the pure resolver and client logout helper. The logout helper expires `active_portal`, awaits `signOut({ redirect: false })`, then calls `window.location.replace('/auth/login')`.
- [ ] Re-run the destination tests and verify GREEN.

### Task 2: Remove competing navigation

**Files:**
- Modify: `components/auth/LoginForm.tsx`
- Modify: `app/admin/components/Sidebar.tsx`
- Modify: `app/admin/components/TopNav.tsx`
- Create: `tests/auth-navigation-usage.test.mjs`

**Interfaces:**
- Consumes: `getPostLoginDestination` and `logoutToLogin`.
- Produces: One login destination and one logout navigation per user action.

- [ ] Write failing source regression tests asserting both logout controls call `logoutToLogin`, neither imports `secureLogoutAction`, and LoginForm uses the shared destination resolver in both redirect sites.
- [ ] Run `node --test tests/auth-navigation-usage.test.mjs` and verify RED.
- [ ] Replace both logout handlers and imports. Replace duplicated login role branches with `getPostLoginDestination`, using `router.replace` so login is not retained in browser history.
- [ ] Run focused tests, targeted ESLint, and `npx tsc --noEmit`; inspect the diff and commit only the auth files, tests, and plan.
