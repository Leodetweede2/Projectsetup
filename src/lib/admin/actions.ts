"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { destroyOtherSessions } from "@/lib/auth/session";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { PERMISSIONS, ALL_PERMISSIONS } from "@/lib/rbac/permissions";
import { adminCreateUserSchema, adminUpdateUserSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/auth/actions";

function fieldErrorsFrom(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Create user
// ---------------------------------------------------------------------------
export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission(PERMISSIONS.USERS_WRITE);
  const parsed = adminCreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleIds: formData.getAll("roleIds").map(String),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { name, email, password, roleIds } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { fieldErrors: { email: "An account with this email already exists." } };

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      // Admin-created accounts are pre-verified.
      emailVerified: new Date(),
      roles: { connect: roleIds.map((id) => ({ id })) },
    },
  });

  await logAudit({
    action: AUDIT_ACTIONS.USER_CREATED,
    actorUserId: actor.id,
    targetType: "user",
    targetId: user.id,
    metadata: { email, roleIds },
  });
  revalidatePath("/admin/users");
  return { success: `User ${email} created.` };
}

// ---------------------------------------------------------------------------
// Update user (name, email, roles)
// ---------------------------------------------------------------------------
export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission(PERMISSIONS.USERS_WRITE);
  const parsed = adminUpdateUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
    roleIds: formData.getAll("roleIds").map(String),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { userId, name, email, roleIds } = parsed.data;

  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken && taken.id !== userId) {
    return { fieldErrors: { email: "That email is already in use." } };
  }

  // Guard against locking yourself out of user management.
  if (userId === actor.id) {
    const chosenRoles = await prisma.role.findMany({ where: { id: { in: roleIds } } });
    const stillManages = chosenRoles.some((r) => r.permissions.includes(PERMISSIONS.USERS_WRITE));
    if (!stillManages) {
      return { error: "You cannot remove your own user-management permission." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name, email, roles: { set: roleIds.map((id) => ({ id })) } },
  });

  await logAudit({
    action: AUDIT_ACTIONS.USER_UPDATED,
    actorUserId: actor.id,
    targetType: "user",
    targetId: userId,
    metadata: { email, roleIds },
  });
  revalidatePath("/admin/users");
  return { success: "User updated." };
}

// ---------------------------------------------------------------------------
// Activate / deactivate user
// ---------------------------------------------------------------------------
export async function setUserActiveAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.USERS_WRITE);
  const userId = String(formData.get("userId"));
  const active = formData.get("active") === "true";

  // Never let an admin deactivate their own account.
  if (userId === actor.id && !active) return;

  await prisma.user.update({ where: { id: userId }, data: { isActive: active } });
  if (!active) {
    // Revoke all sessions of a deactivated user immediately.
    await destroyOtherSessions(userId);
  }

  await logAudit({
    action: active ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED,
    actorUserId: actor.id,
    targetType: "user",
    targetId: userId,
  });
  revalidatePath("/admin/users");
}

// ---------------------------------------------------------------------------
// Update role permissions
// ---------------------------------------------------------------------------
export async function updateRolePermissionsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission(PERMISSIONS.ROLES_WRITE);
  const roleId = String(formData.get("roleId"));
  const permissions = formData
    .getAll("permissions")
    .map(String)
    .filter((p) => (ALL_PERMISSIONS as string[]).includes(p));

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return { error: "Role not found." };

  await prisma.role.update({ where: { id: roleId }, data: { permissions } });
  await logAudit({
    action: AUDIT_ACTIONS.ROLE_UPDATED,
    actorUserId: actor.id,
    targetType: "role",
    targetId: roleId,
    metadata: { name: role.name, permissions },
  });
  revalidatePath("/admin/roles");
  return { success: `Permissions for ${role.name} updated.` };
}
