import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Zoning sidebar does not expose Appointment Setting", () => {
  const sidebar = readFileSync("app/admin/components/Sidebar.tsx", "utf8");

  assert.doesNotMatch(sidebar, /\/admin\/zoning\/appointment-setting/);
});

test("Zoning users are excluded from the counter selector", () => {
  const selector = readFileSync("components/admin/CounterSelectorHeader.tsx", "utf8");

  assert.doesNotMatch(selector, /allowedRoles[^;]*MPDC_ZONING/s);
  assert.doesNotMatch(selector, /allowedDepartments[^;]*(?:Zoning|MPDC Zoning)/s);
});
