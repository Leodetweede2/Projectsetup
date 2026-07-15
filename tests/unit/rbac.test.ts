import { describe, expect, it } from "vitest";
import {
  effectivePermissions,
  hasAnyPermission,
  hasPermission,
  hasRole,
  type AuthUser,
} from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";

const adminUser: AuthUser = {
  id: "1",
  email: "admin@example.com",
  name: "Admin",
  isActive: true,
  roles: [
    { name: "ADMIN", permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE] },
    { name: "AUDITOR", permissions: [PERMISSIONS.AUDIT_READ] },
  ],
};

const plainUser: AuthUser = {
  id: "2",
  email: "user@example.com",
  name: "User",
  isActive: true,
  roles: [{ name: "USER", permissions: [] }],
};

describe("RBAC helpers", () => {
  it("computes the union of role permissions", () => {
    const perms = effectivePermissions(adminUser);
    expect(perms.has(PERMISSIONS.USERS_READ)).toBe(true);
    expect(perms.has(PERMISSIONS.AUDIT_READ)).toBe(true);
    expect(perms.size).toBe(3);
  });

  it("hasPermission is true only for granted permissions", () => {
    expect(hasPermission(adminUser, PERMISSIONS.USERS_WRITE)).toBe(true);
    expect(hasPermission(adminUser, PERMISSIONS.ROLES_WRITE)).toBe(false);
    expect(hasPermission(plainUser, PERMISSIONS.USERS_READ)).toBe(false);
  });

  it("hasAnyPermission matches when at least one is granted", () => {
    expect(
      hasAnyPermission(adminUser, [PERMISSIONS.ROLES_WRITE, PERMISSIONS.AUDIT_READ]),
    ).toBe(true);
    expect(
      hasAnyPermission(plainUser, [PERMISSIONS.USERS_READ, PERMISSIONS.AUDIT_READ]),
    ).toBe(false);
  });

  it("null user has no permissions", () => {
    expect(hasPermission(null, PERMISSIONS.USERS_READ)).toBe(false);
    expect(hasAnyPermission(undefined, [PERMISSIONS.USERS_READ])).toBe(false);
  });

  it("hasRole checks role names", () => {
    expect(hasRole(adminUser, "ADMIN")).toBe(true);
    expect(hasRole(adminUser, "SUPERUSER")).toBe(false);
  });
});
