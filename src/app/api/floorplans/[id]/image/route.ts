import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getObject, getSignedUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Serve a floor-plan image. Access-controlled (maps:read). For the Supabase
 * driver it redirects to a short-lived signed URL; for local storage it streams
 * the bytes. This keeps images private and hides the storage backend.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!hasPermission(user, PERMISSIONS.MAPS_READ)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const plan = await prisma.floorPlan.findUnique({
    where: { id },
    select: { imageKey: true },
  });
  if (!plan) return new NextResponse("Not found", { status: 404 });

  const signed = await getSignedUrl(plan.imageKey);
  if (signed) return NextResponse.redirect(signed);

  const obj = await getObject(plan.imageKey);
  if (!obj) return new NextResponse("Image not found", { status: 404 });

  return new NextResponse(new Uint8Array(obj.bytes), {
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
