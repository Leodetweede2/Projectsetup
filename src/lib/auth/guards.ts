import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Permission } from "@/lib/rbac/permissions";
import { hasAnyPermission, hasPermission, type AuthUser } from "@/lib/rbac/hasPermission";
import { getSessionFromCookie } from "./session";

/**
 * Resolve the currently authenticated user (with roles) from the session cookie.
 * Memoized per-request via React `cache` so multiple calls hit the DB once.
 * Returns null when unauthenticated or the account is inactive.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await getSessionFromCookie();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      roles: { select: { name: true, permissions: true } },
    },
  });

  if (!user || !user.isActive) return null;
  return user;
});

/** Require an authenticated user, or redirect to /login. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a specific permission, or redirect to /login (unauth) / /403 (forbidden). */
export async function requirePermission(permission: Permission): Promise<AuthUser> {
  const user = await requireUser();
  if (!hasPermission(user, permission)) redirect("/403");
  return user;
}

/** Require at least one of the given permissions. */
export async function requireAnyPermission(permissions: Permission[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!hasAnyPermission(user, permissions)) redirect("/403");
  return user;
}
