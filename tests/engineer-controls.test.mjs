import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pages = [
  "app/admin/engineer/[id]/inspection/page.tsx",
  "app/admin/engineer/[id]/reinspection/page.tsx",
];

test("Engineer inspection phases do not expose revision controls", () => {
  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.doesNotMatch(source, /Revision Count:/);
    assert.doesNotMatch(source, /Request Revision/);
    assert.doesNotMatch(source, /sendForRevision/);
    assert.doesNotMatch(source, /isRequestingRevision/);
    assert.doesNotMatch(source, /handleRequestRevision/);
  }
});

test("Engineer role does not receive counter or appointment configuration controls", () => {
  const counter = readFileSync("components/admin/CounterSelectorHeader.tsx", "utf8");
  const sidebar = readFileSync("app/admin/components/Sidebar.tsx", "utf8");
  const allowedRoles = counter.match(/const allowedRoles = \[([^\]]+)\]/s)?.[1] ?? "";
  const engineerMenu = sidebar.match(/else if \(role === "ENGINEER"\) \{([\s\S]*?)\n\s*\} else if \(role === "MPDC_ZONING"\)/)?.[1] ?? "";

  assert.doesNotMatch(allowedRoles, /"ENGINEER"/);
  assert.doesNotMatch(engineerMenu, /appointment-setting|Appointment Setting/);
  assert.match(engineerMenu, /Engineer Hub/);
});
