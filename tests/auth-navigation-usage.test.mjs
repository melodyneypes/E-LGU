import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("admin logout controls use the client NextAuth logout flow", () => {
  for (const file of ["app/admin/components/Sidebar.tsx", "app/admin/components/TopNav.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /import \{ logoutToLogin \} from "@\/components\/auth\/logout-to-login"/);
    assert.match(source, /onClick=\{logoutToLogin\}/);
    assert.doesNotMatch(source, /secureLogoutAction/);
  }
});

test("login redirects use one canonical destination resolver", () => {
  const source = readFileSync("components/auth/LoginForm.tsx", "utf8");
  assert.match(source, /import \{ getPostLoginDestination \} from "@\/lib\/auth\/post-login-destination"/);
  assert.ok((source.match(/getPostLoginDestination\(/g) ?? []).length >= 2);
  assert.doesNotMatch(source, /role === "ENGINEER"[\s\S]{0,120}?router\.push/);
});
