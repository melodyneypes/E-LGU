# Project Rules & Customizations

## UI & Form Validation Standards
- Every required input field that fails validation MUST display an **inline error text message** (`text-[10px] text-red-500 font-medium`) underneath the input element.
- Every required input field that fails validation MUST highlight its border with a **red outline/border** (`border-red-500` / `focus-visible:ring-red-500`).
- Required input fields (such as text inputs, textareas, select dropdowns, etc.) MUST NOT have a pre-filled default value (e.g., must start empty or show a placeholder) to ensure users explicitly enter or select a value.
