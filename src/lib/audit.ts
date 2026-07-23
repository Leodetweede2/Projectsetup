import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Well-known audit action names. Extend as needed. */
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "auth.login.success",
  LOGIN_FAILED: "auth.login.failed",
  LOGOUT: "auth.logout",
  REGISTER: "auth.register",
  EMAIL_VERIFIED: "auth.email.verified",
  PASSWORD_RESET_REQUESTED: "auth.password.reset_requested",
  PASSWORD_RESET_COMPLETED: "auth.password.reset_completed",
  PASSWORD_CHANGED: "auth.password.changed",
  PROFILE_UPDATED: "profile.updated",
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DEACTIVATED: "user.deactivated",
  USER_ACTIVATED: "user.activated",
  USER_DELETED: "user.deleted",
  USER_ROLES_CHANGED: "user.roles_changed",
  ROLE_UPDATED: "role.updated",
  FLOORPLAN_CREATED: "floorplan.created",
  FLOORPLAN_UPDATED: "floorplan.updated",
  FLOORPLAN_DELETED: "floorplan.deleted",
  ROOM_CREATED: "room.created",
  ROOM_UPDATED: "room.updated",
  ROOM_DELETED: "room.deleted",
  ASSET_LIST_IMPORTED: "asset_list.imported",
  ASSET_LIST_CLEARED: "asset_list.cleared",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

interface LogAuditInput {
  action: AuditAction | string;
  actorUserId?: string | null;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Record a security-relevant event. Best-effort: failures are swallowed so
 * auditing never blocks the primary action.
 */
export async function logAudit({
  action,
  actorUserId,
  targetType,
  targetId,
  metadata,
}: LogAuditInput): Promise<void> {
  try {
    let ip: string | undefined;
    try {
      const hdrs = await headers();
      ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
    } catch {
      // headers() is unavailable outside a request scope — ignore.
    }

    await prisma.auditLog.create({
      data: {
        action,
        actorUserId: actorUserId ?? null,
        targetType,
        targetId,
        metadata,
        ip,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
