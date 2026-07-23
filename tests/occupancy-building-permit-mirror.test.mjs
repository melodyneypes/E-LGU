import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const pagePath = "app/user/services/occupancy/page.tsx";
const actionsPath = "app/user/services/occupancy/actions.ts";

test("Occupancy provides the complete Occupancy Permit mirror", () => {
  assert.equal(existsSync(pagePath), true, `${pagePath} must exist`);
  assert.equal(existsSync(actionsPath), true, `${actionsPath} must exist`);

  const page = readFileSync(pagePath, "utf8");
  const actions = readFileSync(actionsPath, "utf8");
  const target = `${page}\n${actions}`;

  for (const expected of [
    "submitOccupancyPermit",
    "getExistingOccupancyPermits",
    "resubmitOccupancyPermit",
    "submitOccupancyPermitPaymentProof",
    'code: "OCCUPANCY_PERMIT"',
    'revalidatePath("/user/services/occupancy")',
    "occupancy-permits/",
    'getSecureUploadUrlsAction(uploadRequests, "occupancy_permits")',
    "mapWithConcurrency(uploadJobs, 4,",
    "Occupancy Permit",
  ]) {
    assert.match(target, new RegExp(escapeRegExp(expected)));
  }

  for (const forbidden of [
    "submitBuildingPermit",
    "getExistingBuildingPermits",
    "resubmitBuildingPermit",
    "submitBuildingPermitPaymentProof",
    'code: "BUILDING_PERMIT"',
    "/user/services/building-permit",
    "building-permits/",
    '"building_permits"',
    "Building Permit",
    "building permit",
  ]) {
    assert.doesNotMatch(target, new RegExp(escapeRegExp(forbidden)));
  }

  assert.match(
    page,
    /OCCUPANCY <span[^>]*>PERMIT<\/span>/,
    "the primary page heading must say OCCUPANCY PERMIT"
  );
  assert.doesNotMatch(
    page,
    /BUILDING <span[^>]*>PERMIT<\/span>/,
    "the primary page heading must not retain BUILDING PERMIT"
  );
});

test("Occupancy retains the same file size and critical flow markers as Building Permit", () => {
  assert.equal(existsSync(pagePath), true, `${pagePath} must exist`);
  assert.equal(existsSync(actionsPath), true, `${actionsPath} must exist`);

  const sourcePage = readFileSync("app/user/services/building-permit/page.tsx", "utf8");
  const sourceActions = readFileSync("app/user/services/building-permit/actions.ts", "utf8");
  const targetPage = readFileSync(pagePath, "utf8");
  const targetActions = readFileSync(actionsPath, "utf8");

  assert.equal(targetPage.split(/\r?\n/).length, sourcePage.split(/\r?\n/).length);
  assert.equal(targetActions.split(/\r?\n/).length, sourceActions.split(/\r?\n/).length);

  for (const marker of [
    "const STEPS =",
    'id: "GUIDE"',
    'id: "PROFILE"',
    'id: "DOCUMENTS"',
    'id: "EVALUATION"',
    'id: "BFP"',
    'id: "SUBMIT"',
    "checkActivePropertyPermit",
    "saveTransactionSignature",
    "submitClearancesForReviewAction",
  ]) {
    assert.match(`${targetPage}\n${targetActions}`, new RegExp(escapeRegExp(marker)));
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
