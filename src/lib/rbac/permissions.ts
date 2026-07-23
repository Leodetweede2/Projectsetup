/**
 * Central catalog of RBAC permissions.
 *
 * A permission is a plain string key of the form "<resource>:<action>".
 * Roles are granted a set of these keys (see prisma/schema.prisma `Role.permissions`),
 * and a user's effective permissions are the union of all their roles' keys.
 *
 * To add a new permission, add it here and grant it to the relevant role(s)
 * either in the seed (prisma/seed.ts) or via the admin Roles UI.
 */

export const PERMISSIONS = {
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  USERS_DELETE: "users:delete",
  ROLES_READ: "roles:read",
  ROLES_WRITE: "roles:write",
  AUDIT_READ: "audit:read",
  MAPS_READ: "maps:read",
  MAPS_WRITE: "maps:write",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** All permission keys, useful for granting "everything" to an admin role. */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/** Human-friendly labels + grouping for the admin Roles UI. */
export const PERMISSION_METADATA: Record<
  Permission,
  { label: string; group: string; description: string }
> = {
  [PERMISSIONS.USERS_READ]: {
    label: "View users",
    group: "Users",
    description: "List and view user accounts.",
  },
  [PERMISSIONS.USERS_WRITE]: {
    label: "Manage users",
    group: "Users",
    description: "Create and edit users, assign roles, activate/deactivate.",
  },
  [PERMISSIONS.USERS_DELETE]: {
    label: "Delete users",
    group: "Users",
    description: "Permanently delete user accounts.",
  },
  [PERMISSIONS.ROLES_READ]: {
    label: "View roles",
    group: "Roles",
    description: "List roles and their permissions.",
  },
  [PERMISSIONS.ROLES_WRITE]: {
    label: "Manage roles",
    group: "Roles",
    description: "Create roles and change granted permissions.",
  },
  [PERMISSIONS.AUDIT_READ]: {
    label: "View audit log",
    group: "Audit",
    description: "Read the audit log of security-relevant events.",
  },
  [PERMISSIONS.MAPS_READ]: {
    label: "Find on floor plans",
    group: "Floor plans",
    description: "Search rooms/PCs and view their location on floor plans.",
  },
  [PERMISSIONS.MAPS_WRITE]: {
    label: "Manage floor plans",
    group: "Floor plans",
    description: "Upload floor plans and place/edit room pins.",
  },
};
