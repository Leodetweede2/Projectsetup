import type { Permission } from "./permissions";

/** Minimal shape needed to evaluate permissions — a user with their roles. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  roles: { name: string; permissions: string[] }[];
}

/** The union of all permission keys granted by a user's roles. */
export function effectivePermissions(user: AuthUser): Set<string> {
  const set = new Set<string>();
  for (const role of user.roles) {
    for (const p of role.permissions) set.add(p);
  }
  return set;
}

/** Whether the user has a specific permission. */
export function hasPermission(user: AuthUser | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return effectivePermissions(user).has(permission);
}

/** Whether the user has at least one of the given permissions. */
export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: Permission[],
): boolean {
  if (!user) return false;
  const owned = effectivePermissions(user);
  return permissions.some((p) => owned.has(p));
}

/** Whether the user holds a role by name. */
export function hasRole(user: AuthUser | null | undefined, roleName: string): boolean {
  if (!user) return false;
  return user.roles.some((r) => r.name === roleName);
}
