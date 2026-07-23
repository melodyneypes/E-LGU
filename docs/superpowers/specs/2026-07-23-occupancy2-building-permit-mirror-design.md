# Occupancy2 Building Permit Mirror Design

## Goal

Create `/user/services/occupancy2` as an independent Occupancy Permit service that mirrors the current Building Permit user flow and logic exactly, while leaving the existing `/user/services/occupancy` implementation and all service-card routing untouched.

## Scope

- Copy `app/user/services/building-permit/page.tsx` to `app/user/services/occupancy2/page.tsx`.
- Copy `app/user/services/building-permit/actions.ts` to `app/user/services/occupancy2/actions.ts`.
- Preserve the Building Permit step sequence, fields, validation, document uploads, evaluation display, BFP handling, submission, payment proof, cancellation, revision, and resubmission behavior.
- Replace user-facing `Building Permit` copy with `Occupancy Permit`, preserving capitalization and grammatical form.
- Rename local action and helper identifiers from Building Permit terminology to Occupancy Permit terminology.
- Use transaction type code `OCCUPANCY_PERMIT`.
- Use `/user/services/occupancy2` for route-specific revalidation and navigation.
- Use `occupancy-permits/` for newly uploaded storage objects.

## Explicit Exclusions

- Do not modify anything under `app/user/services/occupancy`.
- Do not change `app/user/services/ServicesClient.tsx`, the landing-page service cards, or any other navigation to point to `/occupancy2`.
- Do not refactor or alter the existing Building Permit service.
- Do not change admin-side routing or workflows as part of this mirror.
- Do not add fields or Occupancy-specific workflow differences beyond the required terminology and identifiers.

## Architecture and Data Flow

The new route is a self-contained mirror consisting of a client page and colocated server actions. The client page gathers the same profile, application, document, evaluation, BFP, submission, revision, and payment inputs as Building Permit. Its server actions authenticate the user, resolve the `OCCUPANCY_PERMIT` transaction type, validate and sanitize payloads, upload files beneath `occupancy-permits/{userId}/...`, and create or update transactions using the same status transitions as the source service.

Existing shared dependencies—including resident lookup, secure-upload URL generation, image compression, document viewing, idle protection, and transaction cancellation—remain unchanged.

## Terminology Mapping

| Building Permit source | Occupancy2 mirror |
| --- | --- |
| `Building Permit` / `building permit` | `Occupancy Permit` / `occupancy permit` |
| `BuildingPermit` / `buildingPermit` | `OccupancyPermit` / `occupancyPermit` |
| `BUILDING_PERMIT` | `OCCUPANCY_PERMIT` |
| `/user/services/building-permit` | `/user/services/occupancy2` |
| `building-permits/` | `occupancy-permits/` |

Generic building/application data terms such as `occupancyUse`, construction details, and document field keys remain unchanged because exact flow and payload compatibility are requirements.

## Error Handling

The mirror retains the source service's authorization checks, transaction ownership checks, status guards, file validation, sanitization, and structured success/error responses. User-visible errors and server logs use Occupancy Permit wording. A missing `OCCUPANCY_PERMIT` transaction type returns a clear configuration error rather than falling back to `BUILDING_PERMIT`.

## Testing and Verification

- Add a source-level regression test that confirms the new files exist and use Occupancy Permit action names, transaction code, route, and storage prefix.
- Assert that Building Permit runtime identifiers and user-facing permit wording are absent from the new mirror, excluding genuinely generic field names.
- Reuse the critical upload-performance expectations from the Building Permit tests: secure URL batching and bounded-concurrency uploads must remain present.
- Run the focused tests, ESLint on the new files, and TypeScript checking. Any unrelated pre-existing repository failures will be reported separately.

## Acceptance Criteria

1. Visiting `/user/services/occupancy2` renders the same flow and layout as the current Building Permit page with Occupancy Permit terminology.
2. New and revised submissions use `OCCUPANCY_PERMIT`, preserve the source status logic, and store new files beneath `occupancy-permits/`.
3. Payment proof, active-application checks, signature saving, cancellation, and barangay loading behave like their Building Permit equivalents.
4. No file under `app/user/services/occupancy` is modified.
5. Existing service-card links remain unchanged.
