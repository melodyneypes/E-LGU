# Occupancy Permit Database Table Design

## Goal

Add a dedicated `OccupancyPermit` database table that mirrors `BuildingPermit`, ensure the `OCCUPANCY_PERMIT` transaction type exists, and persist released Occupancy Permit transactions in their own table.

## Schema

Add an optional `occupancyPermit OccupancyPermit?` relation to `Transaction`.

Add an `OccupancyPermit` Prisma model with the same field structure and constraints as `BuildingPermit`:

- `id`: cuid primary key.
- `transactionId`: unique foreign key to `Transaction`.
- `permitNumber`: unique issued permit number.
- `dateIssued`: issuance timestamp.
- `applicantName`: issued applicant name.
- `projectType`: application description/project type.
- `occupancyUse`: declared occupancy classification.
- `location`: optional property location.
- `estimatedCost`: declared estimated cost.
- `documentUrl`: optional final e-copy URL.
- `issuedBy`: releasing officer.
- `verificationId`: unique public verification identifier.
- Cascading deletion through the transaction relation.

The physical table is created through a Prisma migration. Existing `BuildingPermit` records and schema remain unchanged.

## Transaction Type

The standard transaction-type initializer must upsert `OCCUPANCY_PERMIT` with the same operational configuration as Building Permit:

- Name: `Occupancy Permit`
- Category: `Occupancy Permit`
- Base fee: `1000`
- Delivery fee: `100`
- Non-fixed assessment
- Same required-document configuration and form-schema fields
- `supportsECopy: true`

The upsert must be safe to run repeatedly and must repair missing or outdated configuration.

## Release Persistence

The shared engineering-permit release action reads the transaction type:

- `BUILDING_PERMIT` creates a `BuildingPermit` row with a `BP-YYYY-NNNNN` permit number.
- `OCCUPANCY_PERMIT` creates an `OccupancyPermit` row with an `OP-YYYY-NNNNN` permit number.

Each released transaction writes to exactly one permit table. The release status, e-copy, applicant snapshot, project description, occupancy use, location, estimated cost, issuing officer, email notification, and revalidation behavior remain the same.

Release must be idempotent at the database boundary: because `transactionId` is unique, the action must use `upsert` rather than blindly creating a duplicate row when retried.

## Deletion and Cleanup

User/account cleanup that deletes `BuildingPermit` records must also delete related `OccupancyPermit` records. The relation also uses `onDelete: Cascade` as database-level protection.

## Explicit Exclusions

- Do not combine Building and Occupancy records in the same permit table.
- Do not change the shared `Transaction` lifecycle or departmental statuses.
- Do not change the canonical Citizen route `/user/services/occupancy`.
- Do not restore the deleted modular Occupancy implementation.
- Do not alter unrelated database models or transaction types.

## Testing and Verification

- Schema contract test for the `Transaction.occupancyPermit` relation and mirrored `OccupancyPermit` model.
- Release contract test proving type-specific table selection and `BP-`/`OP-` numbering.
- Transaction-type initializer contract test for `OCCUPANCY_PERMIT`.
- Prisma format and validation.
- Apply the migration to the configured development database.
- Query the database to verify the `OCCUPANCY_PERMIT` row and physical `OccupancyPermit` table.
- Focused tests, ESLint, and TypeScript must pass.

## Acceptance Criteria

1. The database contains an `OccupancyPermit` table.
2. `Transaction` has an optional one-to-one Occupancy Permit relation.
3. The database contains a configured `OCCUPANCY_PERMIT` transaction type.
4. Releasing an Occupancy Permit writes only to `OccupancyPermit`.
5. Releasing a Building Permit continues writing only to `BuildingPermit`.
6. Retrying release does not create a duplicate permit record.
