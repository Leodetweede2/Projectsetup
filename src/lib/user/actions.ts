"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroyOtherSessions, getSessionFromCookie } from "@/lib/auth/session";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { changePasswordSchema, updateProfileSchema } from "@/lib/validation";
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
// Update own profile
// ---------------------------------------------------------------------------
export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { name, email } = parsed.data;

  if (email !== user.email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken && taken.id !== user.id) {
      return { fieldErrors: { email: "That email is already in use." } };
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { name, email } });
  await logAudit({
    action: AUDIT_ACTIONS.PROFILE_UPDATED,
    actorUserId: user.id,
    targetId: user.id,
  });
  revalidatePath("/profile");
  return { success: "Profile updated." };
}

// ---------------------------------------------------------------------------
// Change own password
// ---------------------------------------------------------------------------
export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record) return { error: "Account not found." };

  const ok = await verifyPassword(parsed.data.currentPassword, record.passwordHash);
  if (!ok) return { fieldErrors: { currentPassword: "Current password is incorrect." } };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  // Log out everywhere else for safety, keeping the current session active.
  const current = await getSessionFromCookie();
  await destroyOtherSessions(user.id, current?.tokenHash);
  await logAudit({
    action: AUDIT_ACTIONS.PASSWORD_CHANGED,
    actorUserId: user.id,
    targetId: user.id,
  });
  return { success: "Password changed. Other sessions have been signed out." };
}
