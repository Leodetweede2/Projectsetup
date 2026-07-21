import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { newImageKey, putObject } from "@/lib/storage";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB

/**
 * Create a floor plan from an uploaded (already rasterised) PNG image. The
 * client renders the chosen PDF page to a PNG with pdfjs-dist and posts it here
 * together with the image dimensions and metadata.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!hasPermission(user, PERMISSIONS.MAPS_WRITE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const name = String(form.get("name") ?? "").trim();
    const building = String(form.get("building") ?? "").trim() || null;
    const floor = String(form.get("floor") ?? "").trim() || null;
    const width = Number(form.get("width"));
    const height = Number(form.get("height"));

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing image file." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return NextResponse.json({ error: "Invalid image dimensions." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 30 MB)." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const key = newImageKey(".png");
    await putObject(key, bytes, "image/png");

    const plan = await prisma.floorPlan.create({
      data: {
        name,
        building,
        floor,
        imageKey: key,
        imageWidth: Math.round(width),
        imageHeight: Math.round(height),
      },
    });

    // Optional auto-extracted room pins (from the PDF text layer).
    let roomCount = 0;
    const roomsRaw = form.get("rooms");
    if (typeof roomsRaw === "string" && roomsRaw) {
      const clamp = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
      const parsed = JSON.parse(roomsRaw) as Array<{
        number?: unknown;
        name?: unknown;
        x?: unknown;
        y?: unknown;
      }>;
      const data = parsed
        .filter((r) => typeof r.number === "string" && String(r.number).trim())
        .slice(0, 2000)
        .map((r) => ({
          floorPlanId: plan.id,
          number: String(r.number).trim().slice(0, 60),
          name: r.name ? String(r.name).slice(0, 200) : null,
          x: clamp(Number(r.x)),
          y: clamp(Number(r.y)),
        }));
      if (data.length) {
        await prisma.room.createMany({ data });
        roomCount = data.length;
      }
    }

    await logAudit({
      action: AUDIT_ACTIONS.FLOORPLAN_CREATED,
      actorUserId: user!.id,
      targetType: "floorplan",
      targetId: plan.id,
      metadata: { name, building, floor, roomCount },
    });

    return NextResponse.json({ id: plan.id, roomCount });
  } catch (err) {
    // Always return JSON so the client can show a meaningful message instead of
    // failing on an empty error body.
    console.error("Floor plan upload failed:", err);
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
