# Hide Zoning Counter and Appointment Setting Design

## Goal

Hide the `SET COUNTER` control and the `Appointment Setting` sidebar item from Zoning users so neither control is visible or clickable.

## Scope

The visibility change applies to:

- Users with the `MPDC_ZONING` role.
- Administrative users whose department identifies them as Zoning or MPDC Zoning.

The change is presentation-only. It will not delete or modify the appointment-setting route, APIs, database records, permissions, or Zoning Hub workflow.

## Design

### Counter selector

The shared counter selector will explicitly exclude Zoning identities from its authorization result. A Zoning identity is either the `MPDC_ZONING` role or a department name containing `ZONING`. Other currently authorized roles and departments retain their existing behavior.

Because the component returns `null` when unauthorized, the `SET COUNTER` button, dropdown, and initial prompt dialog will not render and cannot be clicked by Zoning users.

### Sidebar appointment item

The specialized `MPDC_ZONING` sidebar menu will contain only `Zoning Hub`. The shared menu filtering will also remove the Zoning `Appointment Setting` entry for administrative accounts whose department contains `ZONING`.

No replacement menu item or disabled placeholder will be displayed.

## Testing

Regression tests will inspect the shared counter authorization and sidebar menu construction to verify:

- `MPDC_ZONING` is excluded from the counter selector.
- Zoning-department accounts are excluded from the counter selector.
- The specialized `MPDC_ZONING` menu contains only `Zoning Hub`.
- Zoning-department administrative menus cannot include the Zoning appointment-setting item.
- Engineering and other department controls remain unchanged.

Verification will include the focused regression test, ESLint on changed files, and TypeScript checking.

## Success Criteria

- Zoning users cannot see or click `SET COUNTER`.
- Zoning users cannot see or click `Appointment Setting` in the sidebar.
- Zoning Hub remains visible and functional.
- The underlying appointment-setting page and backend remain unchanged.
- No Engineering or Occupancy work is modified by this change.
