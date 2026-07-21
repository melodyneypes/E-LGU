import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pages = [
  "app/user/services/building-permit/page.tsx",
  "app/user/services/building-permit-appointment/page.tsx",
];

test("Building Permit submissions use the controlled upload pool", () => {
  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.match(source, /import \{ mapWithConcurrency \} from "@\/lib\/async\/map-with-concurrency"/);
    assert.match(source, /mapWithConcurrency\(uploadJobs, 4,/);
    assert.match(source, /const uploadJobs: Array<\(\) => Promise<void>> = \[\]/);
    assert.match(source, /uploadJobs\.push\(async \(\) =>/);
  }
});
