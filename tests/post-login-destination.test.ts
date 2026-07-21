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
