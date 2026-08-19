---
trigger: always_on
---

# Linting & Code Verification Rules

## ⚡ When to Lint:
- **NEW FEATURES ONLY**: Run `npm run lint` only when implementing a brand new feature or module.
- **FIXES / TWEAKS / DEBUGGING**: Do **NOT** run lint when fixing bugs, styling tweaks, minor adjustments, or debugging existing components to keep execution fast and nimble.

## 🛠️ Code Preservation Guidelines:
- Do NOT change business logic or architecture unnecessarily.
- Apply minimal, precise fixes only.
- Do NOT delete working code.
- Avoid refactors unless strictly required.
- Preserve React hooks behavior and Next.js patterns.
- Prefer local fixes over global changes.
- Do NOT modify folder structure or APIs unless explicitly requested.
