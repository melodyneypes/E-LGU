# Remove Engineer Inspection Revision Controls

## Scope

Remove revision-related UI from the Building Permit Engineer Inspection and Reinspection phases only. Other phases and server-side revision behavior remain unchanged.

## UI changes

- Remove the `Revision Count` badge from both phase headers.
- Remove the `Request Revision` button and its dialog from both action sections.
- Preserve the reinspection count, approval, reinspection, rejection, and navigation controls.

## Code cleanup

Remove imports, state, and handlers that become unused when the revision dialog is removed. Do not modify shared transaction actions or revision behavior used by other phases.

## Verification

Add a focused source-level regression test that checks both pages no longer expose the revision count or request controls, then run the relevant test and project static checks.
