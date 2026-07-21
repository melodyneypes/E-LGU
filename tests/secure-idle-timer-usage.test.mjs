import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("idle counter updater is pure and logout runs after commit", () => {
  const source = readFileSync("components/shared/SecureIdleTimer.tsx", "utf8");

  assert.match(source, /import \{ logoutToLogin \} from "@\/components\/auth\/logout-to-login"/);
  assert.match(source, /setIdleTime\(prev => prev \+ 1\)/);
  assert.match(source, /hasLoggedOutRef/);
  assert.match(source, /if \(idleTime >= timeoutSeconds && !hasLoggedOutRef\.current\)/);
  assert.match(source, /void logoutToLogin\(\)/);
  assert.doesNotMatch(source, /secureLogoutAction/);
});

test("idle timer retains warning and activity reset behavior", () => {
  const source = readFileSync("components/shared/SecureIdleTimer.tsx", "utf8");

  assert.match(source, /if \(idleTime === warningSeconds\)/);
  assert.match(source, /setShowIdleModal\(true\)/);
  assert.match(source, /setIdleTime\(0\)/);

  for (const eventName of ["mousemove", "keydown", "scroll", "click"]) {
    assert.match(source, new RegExp(`addEventListener\\("${eventName}"`));
    assert.match(source, new RegExp(`removeEventListener\\("${eventName}"`));
  }
});
