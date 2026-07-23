import { prisma } from "@/lib/db";
import { normalizeRoomNumber, planLabel } from "./search";
import { getLatestImport } from "@/lib/assets/queries";
import {
  computeActivity,
  computeBreakdown,
  computeCore,
  computeDepartment,
  computeLocations,
  computePivot,
  detectColumn,
  DEPARTMENT_RE,
  LASTSEEN_RE,
  OS_RE,
  type ActivityStats,
  type AssetRecordLite,
  type BreakdownStats,
  type DashboardStats,
  type DepartmentStats,
  type LocationStat,
  type PivotStats,
  type PlanLite,
} from "./stats";

// Re-export the stats types so existing imports from "@/lib/maps/browse" keep working.
export type {
  ActivityStats,
  BreakdownStat,
  BreakdownStats,
  DashboardStats,
  DepartmentStat,
  DepartmentStats,
  LocationStat,
  PivotStats,
} from "./stats";

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

/** A plan with all its rooms and the asset rows for each room. */
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
      assets: assetsByNorm.get(normalizeRoomNumber(r.number)) ?? [],
    })),
  };
}

export interface DatasetInfo {
  filename: string;
  importedAt: Date;
  rowCount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  department: DepartmentStats;
  pivot: PivotStats | null;
  os: BreakdownStats | null;
  activity: ActivityStats | null;
  locations: LocationStat[];
  /** The imported asset list this dashboard is computed from, if any. */
  dataset: DatasetInfo | null;
}

/**
 * All dashboard statistics in one pass. Fetches the asset list and plans (with
 * rooms) once, then computes every card from that in-memory data via the pure
 * helpers in ./stats — instead of scanning the asset list separately for each
 * statistic.
 */
export async function getDashboardData(prow?: string, pcol?: string): Promise<DashboardData> {
  const imp = await getLatestImport();
  const [planRows, records] = await Promise.all([
    prisma.floorPlan.findMany({
      orderBy: [{ building: "asc" }, { floor: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        building: true,
        floor: true,
        rooms: { select: { number: true } },
      },
    }),
    imp
      ? prisma.assetRecord.findMany({
          where: { importId: imp.id },
          select: { roomNumber: true, data: true },
        })
      : Promise.resolve([] as { roomNumber: string; data: unknown }[]),
  ]);

  const allRooms = planRows.flatMap((p) => p.rooms.map((r) => ({ number: r.number })));
  const roomNorms = new Set(allRooms.map((r) => normalizeRoomNumber(r.number)));

  const recLite: AssetRecordLite[] = records.map((r) => ({
    roomNumber: r.roomNumber,
    data: r.data as Record<string, string>,
  }));
  const data = recLite.map((r) => r.data);
  const assetRoomNumbers = recLite.map((r) => r.roomNumber);

  const columns = imp?.columns ?? [];
  const available = columns.filter((c) => c !== (imp?.roomNumberColumn ?? ""));
  const deptCol = detectColumn(columns, DEPARTMENT_RE);
  const osCol = detectColumn(columns, OS_RE);
  const lastSeenCol = detectColumn(columns, LASTSEEN_RE);

  const plansLite: PlanLite[] = planRows.map((p) => ({
    id: p.id,
    label: planLabel(p),
    roomNorms: p.rooms.map((r) => normalizeRoomNumber(r.number)),
  }));

  return {
    stats: computeCore({
      floorPlans: planRows.length,
      rooms: allRooms,
      roomNorms,
      assetRoomNumbers,
    }),
    department: computeDepartment(recLite, deptCol, roomNorms),
    pivot: imp ? computePivot(data, available, prow, pcol) : null,
    os: osCol ? computeBreakdown(data, osCol) : null,
    activity: lastSeenCol ? computeActivity(data, lastSeenCol) : null,
    locations: computeLocations(plansLite, assetRoomNumbers),
    dataset: imp
      ? { filename: imp.filename, importedAt: imp.createdAt, rowCount: imp.rowCount }
      : null,
  };
}
