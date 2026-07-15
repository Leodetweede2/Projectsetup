import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { destroyCurrentSession } from "@/lib/auth/session";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  await destroyCurrentSession();
  if (user) {
    await logAudit({ action: AUDIT_ACTIONS.LOGOUT, actorUserId: user.id });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
