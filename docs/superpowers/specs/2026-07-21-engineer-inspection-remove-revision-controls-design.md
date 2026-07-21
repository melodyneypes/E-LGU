# Simplify Engineer Controls

## Scope

Remove revision-related UI from the Building Permit Engineer Inspection and Reinspection phases only. Other phases and server-side revision behavior remain unchanged.

Also hide queue and appointment configuration controls from users whose logged-in role is `ENGINEER`. Other roles retain their existing controls.

## UI changes

- Remove the `Revision Count` badge from both phase headers.
- Remove the `Request Revision` button and its dialog from both action sections.
- Preserve the reinspection count, approval, reinspection, rejection, and navigation controls.
- Hide the top-navigation `Set Counter` control for the `ENGINEER` role across Engineering pages.
- Remove `Appointment Setting` from the `ENGINEER` role's sidebar menu.

## Code cleanup

Remove imports, state, and handlers that become unused when the revision dialog is removed. Remove `ENGINEER` from the counter selector's allowed roles and omit the appointment-setting entry from the Engineer-specific sidebar menu. Do not modify shared transaction actions, appointment configuration pages, or revision behavior used by other phases and roles.

## Verification

Add focused regression coverage that checks both phase pages no longer expose the revision count or request controls and confirms the Engineer role no longer receives the counter selector or appointment-setting menu entry. Then run the relevant tests and project static checks.
