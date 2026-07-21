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
