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
  /** Asset-list rows whose room number matches this room. */
  assets: Record<string, string>[];
}

export interface BrowsePlan {
  id: string;
  name: string;
  building: string | null;
  floor: string | null;
  /** Column headers of the imported asset list (for rendering the PC rows). */
  assetColumns: string[];
  /** Which asset column holds the room number (so it can be de-emphasised). */
  assetRoomColumn: string | null;
  rooms: BrowseRoom[];
}

/** A plan with all its rooms, linked devices, and the asset rows for each room. */
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

  // Group asset rows by (normalised) room number.
  const assetsByNorm = new Map<string, Record<string, string>[]>();
  let assetColumns: string[] = [];
  let assetRoomColumn: string | null = null;
  const imp = await getLatestImport();
  if (imp) {
    assetColumns = imp.columns;
    assetRoomColumn = imp.roomNumberColumn;
    const recs = await prisma.assetRecord.findMany({
      where: { importId: imp.id },
      select: { roomNumber: true, data: true },
    });
    for (const r of recs) {
      const list = assetsByNorm.get(r.roomNumber) ?? [];
      list.push(r.data as Record<string, string>);
      assetsByNorm.set(r.roomNumber, list);
    }
  }

  return {
    id: plan.id,
    name: plan.name,
    building: plan.building,
    floor: plan.floor,
    assetColumns,
    assetRoomColumn,
    rooms: plan.rooms.map((r) => ({
      id: r.id,
      number: r.number,
      name: r.name,
      department: r.department,
      x: r.x,
      y: r.y,
      devices: r.devices,
      assets: assetsByNorm.get(normalizeRoomNumber(r.number)) ?? [],
    })),
  };
}

export interface DashboardStats {
  floorPlans: number;
  rooms: number;
  roomsWithPcs: number;
  pcsTotal: number;
  pcsLocated: number;
  pcsUnlocated: number;
  locatedPct: number;
  devices: number;
}

/** High-level counts for the dashboard. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [floorPlans, devices, roomRows] = await Promise.all([
    prisma.floorPlan.count(),
    prisma.device.count(),
    prisma.room.findMany({ select: { number: true, _count: { select: { devices: true } } } }),
  ]);

  const roomNorms = new Set(roomRows.map((r) => normalizeRoomNumber(r.number)));

  let pcsTotal = 0;
  let pcsLocated = 0;
  const assetNorms = new Set<string>();
  const imp = await getLatestImport();
  if (imp) {
    const recs = await prisma.assetRecord.findMany({
      where: { importId: imp.id },
      select: { roomNumber: true },
    });
    pcsTotal = recs.length;
    for (const r of recs) {
      assetNorms.add(r.roomNumber);
      if (roomNorms.has(r.roomNumber)) pcsLocated++;
    }
  }

  const roomsWithPcs = roomRows.filter(
    (r) => r._count.devices > 0 || assetNorms.has(normalizeRoomNumber(r.number)),
  ).length;

  return {
    floorPlans,
    rooms: roomRows.length,
    roomsWithPcs,
    pcsTotal,
    pcsLocated,
    pcsUnlocated: pcsTotal - pcsLocated,
    locatedPct: pcsTotal ? Math.round((pcsLocated / pcsTotal) * 100) : 0,
    devices,
  };
}
