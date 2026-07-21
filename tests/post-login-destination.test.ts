import test from "node:test";
import assert from "node:assert/strict";
import { getPostLoginDestination } from "../lib/auth/post-login-destination";

test("resolves department roles to one canonical destination", () => {
  const cases = [
    [{ role: "ENGINEER" }, "/admin/engineer"],
    [{ role: "MPDC_ZONING" }, "/admin/zoning"],
    [{ role: "TREASURY_STAFF" }, "/admin/treasury?category=CEDULA"],
    [{ role: "ADMIN_AIDE" }, "/admin/bplo"],
    [{ role: "ADMIN", department: "TREASURY" }, "/admin/treasury?category=CEDULA"],
    [{ role: "ADMIN", department: "BPLO" }, "/admin/bplo"],
    [{ role: "ADMIN", department: "CIVIL_REGISTRY" }, "/admin/registrar"],
    [{ role: "ADMIN", accessiblePages: ["/admin/users"] }, "/admin/users"],
    [{ role: "ADMIN" }, "/admin/dashboard"],
    [{ role: "USER" }, "/"],
  ] as const;

  for (const [user, expected] of cases) {
    assert.equal(getPostLoginDestination(user), expected);
  }
});

test("specialized role destinations take precedence over accessible page ordering", () => {
  assert.equal(
    getPostLoginDestination({ role: "ENGINEER", accessiblePages: ["/admin/dashboard"] }),
    "/admin/engineer"
  );
});

test("uses only safe local callback destinations for residents", () => {
  assert.equal(
    getPostLoginDestination({ role: "USER" }, "/user/services/building-permit"),
    "/user/services/building-permit"
  );
  assert.equal(
    getPostLoginDestination({ role: "USER" }, "/user/services/cedula-appointment?step=2"),
    "/user/services/cedula-appointment?step=2"
  );

  for (const unsafe of [
    "https://evil.example/path",
    "//evil.example/path",
    "javascript:alert(1)",
  ]) {
    assert.equal(getPostLoginDestination({ role: "USER" }, unsafe), "/");
  }

  assert.equal(getPostLoginDestination({ role: "USER" }, null), "/");
  assert.equal(
    getPostLoginDestination({ role: "ADMIN" }, "/user/services/building-permit"),
    "/admin/dashboard"
  );
});
