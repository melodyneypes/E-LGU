# Occupancy Permit Departmental Mirror Design

## Goal

Make `OCCUPANCY_PERMIT` follow the exact existing Building Permit lifecycle from Citizen submission through departmental processing and final release. Occupancy Permit must use the same screens, roles, statuses, validations, fee logic, revision rules, BFP workflow, and release behavior. Only the permit identity, displayed permit name, Citizen route, and type-specific storage namespace differ.

## Canonical Source

The existing `BUILDING_PERMIT` implementation is the canonical workflow. Occupancy Permit does not introduce a new workflow, role, status, validation rule, fee policy, queue, or departmental screen.

## End-to-End Flow

1. A signed-in Citizen submits from `/user/services/occupancy2`.
2. The application is created with type `OCCUPANCY_PERMIT` and the same initial status as Building Permit.
3. The application appears in the same Engineer and Zoning dashboards and status counts as Building Permit.
4. Engineer and Zoning staff can open the same phase routes and perform the same evaluation, inspection, reinspection, and fee-assessment actions.
5. The same Treasury eligibility, assessment, collection, payment-revision, and status-transition logic applies.
6. The same Engineer-to-BFP endorsement, BFP acknowledgment, clearance upload, countdown, and return-to-Engineer behavior applies.
7. The Engineer uses the same final e-copy and release process.
8. The Citizen sees the same progress, payment, revision, clearance, and released-permit behavior in `/user/services/occupancy2`.

## Permit Identity

| Building Permit | Occupancy Permit |
| --- | --- |
| `BUILDING_PERMIT` | `OCCUPANCY_PERMIT` |
| Building Permit | Occupancy Permit |
| `/user/services/building-permit` | `/user/services/occupancy2` |
| `building-permits/` | `occupancy-permits/` |
| Building Permit e-copy wording | Occupancy Permit e-copy wording |

Generic building and construction terms in requirements, property details, occupancy classifications, statutory references, and BFP instructions remain unchanged when they describe the underlying property or regulation rather than the permit identity.

## Shared Departmental Behavior

Every condition that currently identifies a Building Permit for workflow purposes must also identify an Occupancy Permit. This includes:

- Engineer and MPDC/Zoning role authorization.
- Engineer and Zoning dashboard queries, pending counts, and status counts.
- Evaluation eligibility and supported transaction-type checks.
- Inspection, reinspection, fee assessment, endorsement, rejection, and revision rules.
- Treasury dashboard visibility, assessed-fee hydration, payment actionability, and fiscal calculations.
- BFP dashboard queries, status counts, acknowledgment, clearance submission, and Engineer return flow.
- Registrar/shared transaction views where the Building Permit path is reused.
- Rejection limits and cleanup categorization.
- Citizen request/appointment/report redirects and payment-status presentation.

The implementation may introduce a small shared classifier for the two permit codes, but that classifier must only express the existing Building Permit workflow membership. It must not change the workflow itself.

## Departmental Screens and Copy

The same shared departmental screens are used. When the transaction code is `OCCUPANCY_PERMIT`, headings, descriptions, toast messages, labels, and e-copy text that name the permit must say “Occupancy Permit.” When the code is `BUILDING_PERMIT`, existing Building Permit wording remains unchanged.

## Data and Status Compatibility

Occupancy Permit uses the same transaction fields, `additionalData` structure, fiscal snapshot structure, status values, BFP fields, zoning fields, fee-assessment fields, revision counters, and final e-copy fields as Building Permit. No schema migration or new status enum is required.

The `OCCUPANCY_PERMIT` transaction type must exist. Initialization or seed logic used by the application must recognize it without changing the existing Building Permit configuration.

## Explicit Exclusions

- Do not modify anything under `app/user/services/occupancy`.
- Do not create a separate departmental workflow or duplicate admin pages.
- Do not change the sequence or meaning of Building Permit statuses.
- Do not change Building Permit behavior, wording, routes, or transaction data.
- Do not alter unrelated Business Permit, Cedula, or Civil Registry behavior.
- Do not redirect the public Occupancy service card as part of this task.

## Testing

Regression tests must prove that:

- `OCCUPANCY_PERMIT` is accepted anywhere the Building Permit departmental flow is accepted.
- Engineer/Zoning, Treasury, and BFP queries include both permit types.
- Building Permit behavior remains accepted and unchanged.
- Citizen Building Permit records route to `/user/services/building-permit`.
- Citizen Occupancy Permit records route to `/user/services/occupancy2`.
- Occupancy transactions receive Occupancy Permit labels on shared departmental screens.
- The legacy `/app/user/services/occupancy` directory is not part of the implementation diff.

Focused tests, ESLint for changed files, and full TypeScript checking must pass before completion.

## Acceptance Criteria

1. An `OCCUPANCY_PERMIT` submission can complete every stage available to a `BUILDING_PERMIT` submission without an unsupported-type or role-authorization error.
2. It appears in the same relevant departmental dashboards, queues, and counts.
3. All status transitions and policies match Building Permit exactly.
4. Department staff and the Citizen see Occupancy Permit identity and the correct `/occupancy2` route.
5. Building Permit behavior has no regression.
6. No file under `app/user/services/occupancy` is modified.
