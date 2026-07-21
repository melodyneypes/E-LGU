# Service Navigation Callback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve a resident's requested internal service URL through an authentication redirect instead of returning the resident to `/`.

**Architecture:** Extend the existing pure post-login destination module with a USER-only, same-origin callback resolver. Middleware will place the complete local request target in both the login callback parameter and an internal request header; the user layout will use that header for its independent session fallback, and LoginForm will consume the validated callback.

**Tech Stack:** Next.js 16 App Router, NextAuth 4, React 19, TypeScript, Node test runner, ESLint

## Global Constraints

- Preserve existing staff/admin destination routing.
- Preserve maintenance-mode precedence.
- Accept only local callback paths beginning with exactly one `/`; reject absolute and protocol-relative URLs.
- Preserve query strings on valid local callback paths.
- Do not change service pages, application forms, or authorization rules.
- Use `router.replace` for login completion.

---

### Task 1: Safe USER callback resolver

**Files:**
- Modify: `lib/auth/post-login-destination.ts`
- Modify: `tests/post-login-destination.test.ts`

**Interfaces:**
- Consumes: `getPostLoginDestination(user: LoginUser): string`
- Produces: `getPostLoginDestination(user: LoginUser, callbackUrl?: string | null): string`

- [ ] **Step 1: Write failing callback validation tests**

Add test cases proving that USER accounts accept `/user/services/building-permit` and `/user/services/cedula-appointment?step=2`, while `https://evil.example/path`, `//evil.example/path`, `javascript:alert(1)`, and missing callbacks resolve to `/`. Add a case proving an ADMIN ignores `/user/services/building-permit` and keeps `/admin/dashboard`.

```ts
test("uses only safe local callback destinations for residents", () => {
  assert.equal(getPostLoginDestination({ role: "USER" }, "/user/services/building-permit"), "/user/services/building-permit");
  assert.equal(getPostLoginDestination({ role: "USER" }, "/user/services/cedula-appointment?step=2"), "/user/services/cedula-appointment?step=2");
  for (const unsafe of ["https://evil.example/path", "//evil.example/path", "javascript:alert(1)"]) {
    assert.equal(getPostLoginDestination({ role: "USER" }, unsafe), "/");
  }
  assert.equal(getPostLoginDestination({ role: "USER" }, null), "/");
  assert.equal(getPostLoginDestination({ role: "ADMIN" }, "/user/services/building-permit"), "/admin/dashboard");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx tsx --test tests/post-login-destination.test.ts`

Expected: FAIL because the existing function ignores its second argument and returns `/` for the valid USER callback.

- [ ] **Step 3: Implement the minimal resolver extension**

Change the exported function to accept `callbackUrl?: string | null`. In the existing `role === "USER"` branch, return the callback only when `callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")`; otherwise return `/`. Leave every non-USER branch unchanged.

```ts
export function getPostLoginDestination(
  user: LoginUser,
  callbackUrl?: string | null
): string {
  if (user.role === "USER") {
    return callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/";
  }
  // existing staff/admin rules remain unchanged
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx tsx --test tests/post-login-destination.test.ts`

Expected: all destination tests PASS.

- [ ] **Step 5: Commit the resolver**

```bash
git add lib/auth/post-login-destination.ts tests/post-login-destination.test.ts
git commit -m "fix: preserve safe resident login callbacks"
```

### Task 2: Preserve the requested route at authentication boundaries

**Files:**
- Modify: `middleware.ts`
- Modify: `app/user/layout.tsx`
- Create: `tests/service-auth-callback-usage.test.mjs`

**Interfaces:**
- Produces request header: `x-request-target` containing `pathname + search`
- Produces login query parameter: `callbackUrl=<encoded local request target>`
- Consumes in layout: `headers().get("x-request-target")`

- [ ] **Step 1: Write the failing source integration test**

Create a Node test that reads both files and asserts middleware builds `requestTarget` from pathname and search, assigns it to the login URL's `callbackUrl`, forwards it as `x-request-target`, and that the user layout uses `x-request-target` when constructing its login redirect.

```js
test("auth boundaries preserve the requested user route", () => {
  const middleware = readFileSync("middleware.ts", "utf8");
  const layout = readFileSync("app/user/layout.tsx", "utf8");

  assert.match(middleware, /const requestTarget = `\$\{url\.pathname\}\$\{url\.search\}`/);
  assert.match(middleware, /redirectUrl\.searchParams\.set\("callbackUrl", requestTarget\)/);
  assert.match(middleware, /requestHeaders\.set\("x-request-target", requestTarget\)/);
  assert.match(layout, /headersList\.get\("x-request-target"\)/);
  assert.match(layout, /callbackUrl/);
});
```

- [ ] **Step 2: Run the integration test and verify RED**

Run: `node --test tests/service-auth-callback-usage.test.mjs`

Expected: FAIL because neither authentication boundary currently preserves the target.

- [ ] **Step 3: Add callback propagation to middleware**

After cloning `req.nextUrl`, declare `const requestTarget = `${url.pathname}${url.search}`;`. In the missing-token branch, set `redirectUrl.searchParams.set("callbackUrl", requestTarget)` before returning. Before `NextResponse.next`, set both `x-pathname` and `x-request-target` on `requestHeaders`.

- [ ] **Step 4: Add callback propagation to the user layout**

Read `const requestTarget = headersList.get("x-request-target") || pathname || "/";`. Replace the plain unauthenticated redirect with a URL-safe relative login destination:

```ts
redirect(`/auth/login?callbackUrl=${encodeURIComponent(requestTarget)}`);
```

Do not add callbacks to account-deactivation redirects because those intentionally sign out the account.

- [ ] **Step 5: Run the integration test and verify GREEN**

Run: `node --test tests/service-auth-callback-usage.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the authentication boundaries**

```bash
git add middleware.ts app/user/layout.tsx tests/service-auth-callback-usage.test.mjs
git commit -m "fix: retain protected user request destination"
```

### Task 3: Consume the callback after login

**Files:**
- Modify: `components/auth/LoginForm.tsx`
- Modify: `tests/auth-navigation-usage.test.mjs`

**Interfaces:**
- Consumes: `getPostLoginDestination(user, callbackUrl)` from Task 1
- Consumes query parameter: `callbackUrl`

- [ ] **Step 1: Write the failing LoginForm usage assertions**

Extend the existing source test to require `useSearchParams`, a `callbackUrl` read, and at least two calls passing the callback to `getPostLoginDestination`.

```js
assert.match(source, /useSearchParams/);
assert.match(source, /searchParams\.get\("callbackUrl"\)/);
assert.ok((source.match(/getPostLoginDestination\([^,]+, callbackUrl\)/g) ?? []).length >= 2);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/auth-navigation-usage.test.mjs`

Expected: FAIL because LoginForm currently uses only the role-based destination.

- [ ] **Step 3: Read and use the callback in LoginForm**

Import `useSearchParams` beside `useRouter`, declare `const searchParams = useSearchParams();` and `const callbackUrl = searchParams.get("callbackUrl");`, then pass `callbackUrl` to both resident-capable calls:

```ts
router.replace(getPostLoginDestination(user, callbackUrl));
router.replace(getPostLoginDestination(session.user, callbackUrl));
```

Include `callbackUrl` in the relevant effect and callback dependency arrays. Leave maintenance handling and admin cookie logic unchanged.

- [ ] **Step 4: Run focused navigation tests and verify GREEN**

Run: `npx tsx --test tests/post-login-destination.test.ts && node --test tests/auth-navigation-usage.test.mjs tests/service-auth-callback-usage.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit LoginForm integration**

```bash
git add components/auth/LoginForm.tsx tests/auth-navigation-usage.test.mjs
git commit -m "fix: return residents to requested service"
```

### Task 4: Full verification

**Files:**
- Verify only; no expected production edits

**Interfaces:**
- Consumes all outputs from Tasks 1-3
- Produces verification evidence for handoff

- [ ] **Step 1: Run all focused regression tests**

Run: `npx tsx --test tests/post-login-destination.test.ts && node --test tests/auth-navigation-usage.test.mjs tests/service-auth-callback-usage.test.mjs`

Expected: all tests PASS with no warnings or errors.

- [ ] **Step 2: Run lint on changed source files**

Run: `npx eslint middleware.ts app/user/layout.tsx components/auth/LoginForm.tsx lib/auth/post-login-destination.ts tests/post-login-destination.test.ts tests/auth-navigation-usage.test.mjs tests/service-auth-callback-usage.test.mjs`

Expected: exit code 0.

- [ ] **Step 3: Run TypeScript checking**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 4: Inspect final scope**

Run: `git status --short && git diff --stat HEAD~3..HEAD`

Expected: only the pre-existing untracked `app/user/services/occupancy/` remains outside the service-navigation commits; no unrelated files are included.
