# Service Navigation Callback Design

## Problem

Authenticated residents can click a service link such as Building Permit, Business Permit, Civil Registry, or Cedula and end up at the home page (`/`). The service links already point to the correct routes. The failure occurs when a protected service request is sent through the authentication fallback: the login redirect does not preserve the requested path, and the login page subsequently applies the default USER destination (`/`).

## Goal

Preserve the originally requested internal service route through the authentication handoff so a valid resident session returns to that service instead of the home page.

## Scope

- Protected `/user` requests redirected by middleware.
- Protected `/user` requests redirected by the server user layout.
- Existing-login handling and successful-login navigation in `LoginForm`.
- Regression tests for safe callback resolution and route usage.

The service pages, application forms, authorization rules, and non-USER admin destinations will not be changed.

## Design

### Callback creation

When a protected request has no usable server session, redirect to `/auth/login` with a `callbackUrl` containing the request's local pathname and query string. Middleware can read this directly from `req.nextUrl`.

The server user layout will use the middleware-provided request pathname. If it must redirect independently, it will also include that local pathname as the callback. This keeps both authentication boundaries consistent.

### Callback validation

Create a small pure helper that accepts the callback value and a fallback destination. It returns the callback only when all of these conditions hold:

- It begins with exactly one `/`.
- It is not a protocol-relative URL such as `//example.com`.
- It does not contain a scheme or resolve outside the current site.

Missing or invalid callback values return the existing role-based destination. This prevents an open-redirect vulnerability.

### Login navigation

`LoginForm` will read `callbackUrl` from the current login URL. For USER accounts, a valid callback takes precedence over the default `/` destination in both cases:

- An authenticated session is detected while the login page is open.
- A credentials login succeeds.

Staff/admin accounts retain their current department and accessible-page routing. Maintenance-mode behavior also retains its current precedence.

### Navigation behavior

Navigation will continue using `router.replace`, preventing the login page from remaining in browser history. No service link will be converted to a hard reload.

## Error and Security Handling

- Invalid, malformed, absolute, or protocol-relative callback URLs are ignored.
- A missing callback preserves existing behavior.
- Query strings belonging to the requested internal page are preserved.
- The callback never overrides maintenance handling or staff/admin portal routing.

## Testing

Automated tests will verify:

- A local service callback is preserved.
- A local callback with a query string is preserved.
- Absolute and protocol-relative callbacks fall back safely.
- Missing callbacks use the existing role destination.
- Middleware and the user layout attach the callback parameter to login redirects.
- `LoginForm` uses the safe callback resolver without changing admin routing.

Verification will include the focused tests, linting of changed files, and TypeScript checking.

## Success Criteria

- Clicking any displayed resident service opens its corresponding `/user/services/...` page.
- A temporary authentication handoff returns to the requested service, not `/`.
- Existing direct login destinations for USER and administrative roles remain unchanged when no callback is present.
- External callback URLs cannot redirect the browser away from E-LGU.
