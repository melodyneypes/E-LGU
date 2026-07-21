# Secure Idle Timer Render-Update Fix Design

## Problem

`SecureIdleTimer` performs side effects inside the functional updater passed to `setIdleTime`. At the timeout threshold, that updater invokes the redirecting `secureLogoutAction`; at the warning threshold, it updates another state value. React requires functional state updaters to remain pure, so the redirect updates the Router while React is processing the timer component and produces the `Cannot update a component (Router) while rendering a different component (SecureIdleTimer)` error.

## Goal

Preserve the inactivity warning and automatic logout behavior without triggering navigation or other side effects during a state update.

## Design

The interval callback will only increment `idleTime`. A separate effect will observe `idleTime` and perform threshold side effects after React commits the state update:

- At `warningSeconds`, show the inactivity modal.
- At or beyond `timeoutSeconds`, trigger logout once.

A ref will guard the timeout action so rerenders cannot start duplicate logout operations. Normal user activity will continue resetting the timer and hiding the warning before logout begins.

The timeout will use the existing client-side `logoutToLogin()` helper. That helper awaits NextAuth sign-out without an automatic redirect, clears the active portal cookie, and performs a hard replacement to `/auth/login`. This avoids the redirecting Server Action and its `303` transport response while preserving session cleanup.

## Scope

- Modify the shared `SecureIdleTimer` component and focused regression tests.
- All existing service pages receive the fix through their existing shared component usage.
- Keep the existing timeout values, warning values, modal UI, activity events, and toast copy.
- Do not modify individual Building Permit or Civil Registry pages.
- Do not modify the untracked Occupancy module.

## Testing

Regression tests will verify:

- The functional `setIdleTime` updater only returns the next counter value.
- Logout and warning side effects are outside the state updater.
- Logout uses `logoutToLogin()` rather than `secureLogoutAction()`.
- A ref prevents duplicate timeout logout calls.
- Existing activity listeners and cleanup remain present.

Verification will include focused tests, ESLint, and TypeScript checking.

## Success Criteria

- The Router render-update console error no longer occurs at idle timeout.
- The warning modal still appears at the configured warning threshold.
- Automatic logout occurs once at the configured timeout.
- User activity continues to reset the warning and counter before timeout.
