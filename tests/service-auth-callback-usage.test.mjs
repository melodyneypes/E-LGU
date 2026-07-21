import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("auth boundaries preserve the requested user route", () => {
  const middleware = readFileSync("middleware.ts", "utf8");
  const layout = readFileSync("app/user/layout.tsx", "utf8");

  assert.match(middleware, /const requestTarget = `\$\{url\.pathname\}\$\{url\.search\}`/);
  assert.match(middleware, /redirectUrl\.searchParams\.set\("callbackUrl", requestTarget\)/);
  assert.match(middleware, /requestHeaders\.set\("x-request-target", requestTarget\)/);
  assert.match(layout, /headersList\.get\("x-request-target"\)/);
  assert.match(layout, /callbackUrl=\$\{encodeURIComponent\(requestTarget\)\}/);
});
