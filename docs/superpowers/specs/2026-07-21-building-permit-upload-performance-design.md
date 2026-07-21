# Building Permit Upload Performance

## Goal

Reduce Building Permit submission latency by uploading independent documents concurrently without changing the submitted payload, workflow status, appointment handling, or security checks.

## Scope

Apply the optimization to both resident submission flows:

- `app/user/services/building-permit/page.tsx`
- `app/user/services/building-permit-appointment/page.tsx`

Do not change Supabase bucket configuration, signed-upload authorization, server-side file validation, database writes, signature persistence, queue numbering, or post-submit UI state.

## Design

Add a small reusable concurrency helper that maps upload jobs while allowing no more than four active jobs. Each job keeps its existing image compression, unique signed-upload URL request, direct Supabase upload, and public URL result.

Build upload jobs for IDs, TCT, requirements, permits, and revision documents, then execute independent jobs through the helper. Preserve each document's original key so completion order cannot associate a URL with the wrong field. Existing remote URLs remain unchanged and are not uploaded again.

## Failure behavior

Any failed upload rejects the batch and prevents the server submission action from running. The existing submission error handling remains responsible for notifying the resident and resetting the submitting state. Already uploaded objects from that attempt may remain in storage, matching the current behavior when a later sequential upload fails.

## Verification

Unit-test the helper with delayed jobs to prove that it preserves input ordering, never exceeds four active jobs, supports fewer jobs than the limit, and rejects when a job fails. Run the focused tests and ESLint on the helper and both modified pages.
