import { prisma } from "@/lib/db";
import { normalizeRoomNumber } from "./search";
import { getLatestImport } from "@/lib/assets/queries";

/** All floor plans for the plan switcher. */
export async function listFloorPlans() {
  return prisma.floorPlan.findMany({
    orderBy: [{ building: "asc" }, { floor: "asc" }, { name: "asc" }],
    select: { id: true, name: true, building: true, floor: true },
  });
}

export interface BrowseRoom {
  id: string;
  number: string;
  name: string | null;
  department: string | null;
  x: number;
  y: number;
  devices: { id: string; name: string; assetTag: string | null }[];
  /** Number of asset-list rows whose room number matches this room. */
  assetCount: number;
}

export interface BrowsePlan {
  id: string;
  name: string;
  building: string | null;
  floor: string | null;
  rooms: BrowseRoom[];
}

/** A plan with all its rooms, linked devices, and asset-row counts (for browsing). */
export async function getPlanForBrowse(planId: string): Promise<BrowsePlan | null> {
  const plan = await prisma.floorPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      name: true,
      building: true,
      floor: true,
      rooms: {
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          name: true,
          department: true,
          x: true,
          y: true,
          devices: { orderBy: { name: "asc" }, select: { id: true, name: true, assetTag: true } },
        },
      },
    },
  });
  if (!plan) return null;

  // Count asset-list rows per (normalised) room number.
  const assetByNorm = new Map<string, number>();
  const imp = await getLatestImport();
  if (imp) {
    const recs = await prisma.assetRecord.findMany({
      where: { importId: imp.id },
      select: { roomNumber: true },
    });
    for (const r of recs) assetByNorm.set(r.roomNumber, (assetByNorm.get(r.roomNumber) ?? 0) + 1);
  }

  return {
    id: plan.id,
    name: plan.name,
    building: plan.building,
    floor: plan.floor,
    rooms: plan.rooms.map((r) => ({
      id: r.id,
      number: r.number,
      name: r.name,
      department: r.department,
      x: r.x,
      y: r.y,
      devices: r.devices,
      assetCount: assetByNorm.get(normalizeRoomNumber(r.number)) ?? 0,
    })),
  };
}
