import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("shared engineering-permit identity supports Building and Occupancy permits", () => {
  const helperPath = "lib/transactions/engineering-permit.ts";
  assert.equal(existsSync(helperPath), true, `${helperPath} must exist`);

  const source = read(helperPath);
  assert.match(source, /export function isEngineeringPermitCode/);
  assert.match(source, /code\.startsWith\("BUILDING_PERMIT"\)/);
  assert.match(source, /code\.startsWith\("OCCUPANCY_PERMIT"\)/);
  assert.match(source, /export function getEngineeringPermitLabel/);
  assert.match(source, /export function getEngineeringPermitCitizenRoute/);
  assert.match(source, /"Building Permit"/);
  assert.match(source, /"Occupancy Permit"/);
  assert.match(source, /"\/user\/services\/building-permit"/);
  assert.match(source, /"\/user\/services\/occupancy"/);
  assert.doesNotMatch(source, /"\/user\/services\/occupancy2"/);
});

test("server actions admit Occupancy Permit to the exact Building Permit workflow", () => {
  const actions = read("app/admin/transactions/actions.ts");

  assert.match(actions, /isEngineeringPermitCode/);
  assert.match(actions, /ENGINEERING_PERMIT_CODES/);
  assert.match(actions, /ENGINEER[\s\S]*MPDC_ZONING[\s\S]*isEngineeringPermit/);
  assert.match(actions, /Unsupported transaction type/);

  for (const functionName of [
    "getEngineerTransactions",
    "getEngineerPendingCount",
    "getEngineerStatusCounts",
    "getBFPTransactions",
    "getBFPStatusCounts",
  ]) {
    const start = actions.indexOf(`export async function ${functionName}`);
    assert.notEqual(start, -1, `${functionName} must exist`);
    const section = actions.slice(start, start + 9000);
    assert.match(
      section,
      /engineeringPermitTypeWhere/,
      `${functionName} must use the shared Building/Occupancy permit filter`
    );
  }
});

test("department screens use the engineering-permit workflow classifier", () => {
  for (const path of [
    "app/admin/zoning/[id]/page.tsx",
    "app/admin/engineer/[id]/page.tsx",
    "app/admin/treasury/[id]/page.tsx",
    "app/admin/registrar/[id]/page.tsx",
    "app/admin/treasury/TreasuryDashboard.tsx",
  ]) {
    const source = read(path);
    assert.match(
      source,
      /isEngineeringPermitCode/,
      `${path} must recognize Occupancy Permit as the same workflow`
    );
  }

  for (const path of [
    "app/admin/engineer/[id]/evaluation/page.tsx",
    "app/admin/engineer/[id]/fees/page.tsx",
    "app/admin/engineer/[id]/submit/page.tsx",
  ]) {
    assert.match(
      read(path),
      /getEngineeringPermitLabel/,
      `${path} must display the transaction-specific permit name`
    );
  }
});

test("Citizen payment and navigation use the shared workflow and correct service route", () => {
  const requestDetail = read("app/user/services/requests/[id]/page.tsx");
  assert.match(requestDetail, /isEngineeringPermitCode/);

  for (const path of [
    "app/user/services/requests/page.tsx",
    "app/user/appointment/page.tsx",
    "app/user/reports/page.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /getEngineeringPermitCitizenRoute/);
    assert.doesNotMatch(source, /user\/services\/occupancy["'`]/);
  }
});

test("cleanup and shared Treasury aggregation recognize Occupancy Permit", () => {
  const cleanup = read("app/api/cron/cleanup-appointments/route.ts");
  const aggregation = read("app/admin/transactions/cedula-actions.ts");

  assert.match(cleanup, /OCCUPANCY_PERMIT/);
  assert.match(aggregation, /OCCUPANCY_PERMIT/);
});
