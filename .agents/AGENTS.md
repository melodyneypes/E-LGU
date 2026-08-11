# Project Agents Config

## ⚠️ DATABASE SAFETY & DATA PRESERVATION RULES (CRITICAL)
- **STRICT PROHIBITION**: NEVER execute any command that drops, wipes, resets, or clears data in the Supabase / PostgreSQL database.
- **FORBIDDEN COMMANDS**:
  - `npx prisma db push --force-reset`
  - `npx prisma migrate reset`
  - `DROP DATABASE`, `DROP TABLE`, `TRUNCATE`
- **MIGRATION POLICY**:
  - Always preserve existing user and production data.
  - If a Prisma schema change causes a data conflict, apply non-destructive field defaults, additive migrations, or ask the user for manual guidance before altering constraints.
  - NEVER clear data to bypass a migration issue.
