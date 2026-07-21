import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Building Permit allocates all signed upload URLs in one server action", () => {
  const page = readFileSync("app/user/services/building-permit/page.tsx", "utf8");
  const actions = readFileSync("app/auth/actions.ts", "utf8");

  assert.match(actions, /export async function getSecureUploadUrlsAction/);
  assert.match(actions, /Promise\.all\(requests\.map/);
  assert.equal(
    (page.match(/getSecureUploadUrlsAction\(uploadRequests, "building_permits"\)/g) ?? []).length,
    1
  );
  assert.doesNotMatch(page, /getSecureUploadUrlAction/);
});

test("synchronous file validation does not download complete PDFs", () => {
  const storage = readFileSync("lib/storage.ts", "utf8");

  assert.doesNotMatch(storage, /const fullResponse = await fetch\(signedData\.signedUrl\)/);
  assert.doesNotMatch(storage, /PDF internal structure/);
  assert.match(storage, /Range: "bytes=0-7"/);
});
