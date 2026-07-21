# Auth Navigation Flicker Fix

## Goal

Remove the raw `303` React Server Component response during Engineering logout and eliminate the competing redirects that make the login page flicker before reaching the Engineer Hub.

## Logout design

Admin logout buttons will use the NextAuth client `signOut` API with `redirect: false`, then perform one hard navigation to `/auth/login`. This lets NextAuth invalidate its session through its supported CSRF-protected endpoint while avoiding a server-action `redirect()` response inside a click handler. The `active_portal` cookie will be expired before navigation.

The existing server logout action remains available to server-only callers unless source inspection proves it is unused; this change only removes it from the two admin client controls.

## Login design

Create one role-to-destination resolver used by the successful credential-submit path. It must explicitly map `ENGINEER` to `/admin/engineer` and preserve existing destinations for users, Treasury, BPLO/Admin Aide, Zoning, Registrar, and general admins.

The passive `useSession` effect remains a guard for users who directly open the login page with an existing session, but it must not navigate while the active login submission owns the transition. The submit handler keeps `isLoggingIn` true until navigation begins, ensuring only one route wins.

## Loading behavior

Keep the existing auth leave animation and global loading screen in this fix. Once duplicate navigation is removed, the loading screen may appear once during the intended transition but must not bounce back to the login page.

## Verification

Add focused tests for all role destinations and source regression checks confirming both admin logout controls use the shared client logout flow rather than the redirecting server action. Run the focused tests, ESLint, and TypeScript checks.
