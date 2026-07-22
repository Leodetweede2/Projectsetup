import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { searchLocations, planLabel } from "@/lib/maps/search";

export const dynamic = "force-dynamic";

/** Live search for the command palette: rooms and PCs, resolved to a plan. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.MAPS_READ)) {
    return NextResponse.json({ results: [] });
  }
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  const results = (await searchLocations(q)).slice(0, 12).map((r) => ({
    roomId: r.room.id,
    number: r.room.number,
    label: planLabel(r.room.floorPlan),
    matchedBy: r.matchedBy,
    deviceName: r.deviceName ?? null,
  }));
  return NextResponse.json({ results });
}
