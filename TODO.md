# TODO - Refactor Users Admin UI Controls

- [x] Update toolbar in `app/admin/users/UsersPage.tsx`:
  - [x] Make `All Roles` select width exactly match Search input: `w-full sm:w-[280px] lg:w-[350px]`
  - [x] Make `All Verification` select width exactly match Search input: `w-full sm:w-[280px] lg:w-[350px]`
  - [x] Ensure identical height (`h-12`), border radius (`rounded-xl`), typography/alignment, and consistent icon+text spacing
  - [x] Remove uneven wrapper sizing (e.g., `sm:w-auto`, `sm:w-[350px]` on selects)
- [x] Update Role dropdown styling in modals:
  - [x] `app/admin/users/AddUserModal.tsx` Role `SelectTrigger` must match modal `Input` styling exactly
  - [x] `app/admin/users/EditUserModal.tsx` Role `SelectTrigger` must match modal `Input` styling exactly
  - [x] Ensure dropdowns align perfectly with input fields (width + trigger styles)
- [x] Run lint/tests and/or build to verify no TS/JSX errors
- [x] Manual responsive check (mobile + desktop) for toolbar and modals

