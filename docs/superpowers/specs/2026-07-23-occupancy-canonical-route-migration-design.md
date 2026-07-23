# Occupancy Canonical Route Migration Design

## Goal

Make the mirrored Occupancy Permit service available exclusively at `/user/services/occupancy` after the user intentionally deleted the previous modular Occupancy implementation and renamed `occupancy2` to `occupancy`.

## Source of Truth

`app/user/services/occupancy/page.tsx` and `app/user/services/occupancy/actions.ts` are the canonical mirrored Occupancy Permit implementation. The deleted `app/user/services/occupancy2` path must not be restored.

## Changes

- Change Occupancy Permit Citizen routing from `/user/services/occupancy2` to `/user/services/occupancy`.
- Change route-specific revalidation to `/user/services/occupancy`.
- Update regression tests to read the canonical `/occupancy` files and expect the canonical URL.
- Rename the Occupancy mirror regression test so its filename no longer refers to `occupancy2`.
- Preserve the existing Occupancy service-card link because it already points to `/user/services/occupancy`.
- Record the moved production files as Git renames when possible so file history remains understandable.

## Explicit Exclusions

- Do not restore the old modular Occupancy implementation.
- Do not add a compatibility redirect from `/occupancy2`.
- Do not change the Occupancy Permit transaction type, departmental flow, status logic, or uploaded-data structure.
- Do not modify unrelated uncommitted files.

## Acceptance Criteria

1. `/user/services/occupancy` renders the mirrored Occupancy Permit service.
2. No runtime source or active test refers to `/user/services/occupancy2`.
3. Citizen Occupancy Permit records route to `/user/services/occupancy`.
4. Focused tests, ESLint, and TypeScript pass.
