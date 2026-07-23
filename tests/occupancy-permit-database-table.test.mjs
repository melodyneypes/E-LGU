import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("Prisma schema defines a dedicated OccupancyPermit relation and table", () => {
  const schema = read("prisma/schema.prisma");

  assert.match(schema, /occupancyPermit\s+OccupancyPermit\?/);
  assert.match(schema, /model OccupancyPermit\s*\{/);
  assert.match(schema, /transactionId\s+String\s+@unique/);
  assert.match(schema, /permitNumber\s+String\s+@unique/);
  assert.match(
    schema,
    /transaction\s+Transaction\s+@relation\(fields: \[transactionId\], references: \[id\], onDelete: Cascade\)/
  );
});

test("migration creates the physical OccupancyPermit table", () => {
  const migrationPath =
    "prisma/migrations/20260723070000_add_occupancy_permit/migration.sql";
  assert.equal(existsSync(migrationPath), true, `${migrationPath} must exist`);

  const migration = read(migrationPath);
  assert.match(migration, /CREATE TABLE "OccupancyPermit"/);
  assert.match(migration, /"transactionId" TEXT NOT NULL/);
  assert.match(migration, /CREATE UNIQUE INDEX "OccupancyPermit_transactionId_key"/);
  assert.match(migration, /CREATE UNIQUE INDEX "OccupancyPermit_permitNumber_key"/);
  assert.match(migration, /ON DELETE CASCADE/);
});

test("transaction type initializer configures Occupancy Permit like Building Permit", () => {
  const actions = read("app/admin/transactions/actions.ts");
  const initializerStart = actions.indexOf(
    "export async function ensureBuildingPermitTransactionTypes"
  );
  const initializerEnd = actions.indexOf(
    "export async function ensureCivilRegistryTransactionTypes",
    initializerStart
  );
  const initializer = actions.slice(initializerStart, initializerEnd);

  assert.match(initializer, /code: "BUILDING_PERMIT"/);
  assert.match(initializer, /code: "OCCUPANCY_PERMIT"/);
  assert.match(initializer, /name: "Occupancy Permit"/);
  assert.match(initializer, /category: "Occupancy Permit"/);
  assert.match(initializer, /baseFee: 1000\.00/);
  assert.match(initializer, /deliveryFee: 100\.00/);
  assert.match(initializer, /supportsECopy: true/);
});

test("release persists each exact type only in its own permit table", () => {
  const actions = read("app/admin/transactions/actions.ts");
  const releaseStart = actions.indexOf(
    "export async function releaseBuildingPermitAction"
  );
  const releaseEnd = actions.indexOf(
    "export async function declinePaymentProofAction",
    releaseStart
  );
  const release = actions.slice(releaseStart, releaseEnd);

  assert.match(release, /include:\s*\{\s*type: true/);
  assert.match(release, /transaction\.type\.code === "BUILDING_PERMIT"/);
  assert.match(release, /transaction\.type\.code === "OCCUPANCY_PERMIT"/);
  assert.match(release, /tx\.buildingPermit\.upsert/);
  assert.match(release, /tx\.occupancyPermit\.upsert/);
  assert.match(release, /`BP-\$\{new Date\(\)\.getFullYear\(\)\}-/);
  assert.match(release, /`OP-\$\{new Date\(\)\.getFullYear\(\)\}-/);
  assert.doesNotMatch(release, /tx\.buildingPermit\.create/);
  assert.doesNotMatch(release, /tx\.occupancyPermit\.create/);
});

test("account cleanup removes OccupancyPermit records", () => {
  const actions = read("app/admin/actions.ts");
  assert.match(actions, /prisma as any\)\.occupancyPermit\.deleteMany/);
});
