import type { ReactNode } from "react";
import type { Permission } from "./permissions";
import { hasAnyPermission, type AuthUser } from "./hasPermission";

interface CanProps {
  user: AuthUser | null | undefined;
  /** Render children only if the user has this permission... */
  permission?: Permission;
  /** ...or any of these permissions. */
  anyOf?: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render UI based on the user's permissions.
 *
 *   <Can user={user} permission={PERMISSIONS.USERS_READ}>
 *     <AdminLink />
 *   </Can>
 *
 * Note: this only controls *display*. Always enforce access with the server
 * guards (requirePermission) in the page/action itself as well.
 */
export function Can({ user, permission, anyOf, children, fallback = null }: CanProps) {
  const needed = [...(permission ? [permission] : []), ...(anyOf ?? [])];
  const allowed = needed.length === 0 ? Boolean(user) : hasAnyPermission(user, needed);
  return <>{allowed ? children : fallback}</>;
}
