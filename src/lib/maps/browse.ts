import { prisma } from "@/lib/db";
import { normalizeRoomNumber, planLabel } from "./search";
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

export interface DepartmentStat {
  name: string;
  total: number;
  /** PCs in this department whose room is placed on a floor plan. */
  located: number;
}

export interface DepartmentStats {
  /** The asset-list column used as the department, or null if none detected. */
  column: string | null;
  /** Number of distinct departments. */
  count: number;
  /** Departments ordered by PC count (descending). */
  top: DepartmentStat[];
}

/** Header of the column that holds the department (Afdeling / Department). */
const DEPARTMENT_COLUMN = /afdeling|afdeeling|department|dept|\bafd\b/i;

/**
 * Per-department PC counts from the latest asset import: how many PCs each
 * department has and how many of those are located on a floor plan.
 */
export async function getDepartmentStats(topN = 8): Promise<DepartmentStats> {
  const imp = await getLatestImport();
  if (!imp) return { column: null, count: 0, top: [] };

  const column = imp.columns.find((c) => DEPARTMENT_COLUMN.test(c)) ?? null;
  if (!column) return { column: null, count: 0, top: [] };

  const [records, roomRows] = await Promise.all([
    prisma.assetRecord.findMany({
      where: { importId: imp.id },
      select: { roomNumber: true, data: true },
    }),
    prisma.room.findMany({ select: { number: true } }),
  ]);
  const roomNorms = new Set(roomRows.map((r) => normalizeRoomNumber(r.number)));

  const map = new Map<string, DepartmentStat>();
  for (const r of records) {
    const data = r.data as Record<string, string>;
    const name = (data[column] ?? "").trim() || "— (unknown)";
    const entry = map.get(name) ?? { name, total: 0, located: 0 };
    entry.total += 1;
    if (roomNorms.has(r.roomNumber)) entry.located += 1;
    map.set(name, entry);
  }

  const top = [...map.values()].sort((a, b) => b.total - a.total).slice(0, topN);
  return { column, count: map.size, top };
}

// ---------------------------------------------------------------------------
// Pivot table (cross-tabulate the asset list by two columns)
// ---------------------------------------------------------------------------

export interface PivotStats {
  /** Columns usable as a pivot dimension. */
  available: string[];
  rowCol: string;
  colCol: string;
  rowKeys: string[];
  colKeys: string[];
  /** counts[rowIndex][colIndex]. */
  counts: number[][];
  /** True totals per row / column (across all values, not just shown ones). */
  rowTotals: number[];
  colTotals: number[];
  total: number;
}

const PIVOT_ROW_RE = /afdeling|department|dept|\bafd\b/i;
const PIVOT_COL_RE = /strosname|osname|\bos\b|besturing|type|status/i;

/**
 * Cross-tabulate the latest asset import by two columns (a pivot table). Defaults
 * to department (rows) × OS/type (columns) but either dimension can be any
 * column. Rows/columns are capped to the busiest ones to stay readable.
 */
export async function getPivotStats(prow?: string, pcol?: string): Promise<PivotStats | null> {
  const imp = await getLatestImport();
  if (!imp) return null;
  const available = imp.columns.filter((c) => c !== imp.roomNumberColumn);
  if (available.length === 0) return null;

  const rowCol =
    (prow && available.includes(prow) && prow) ||
    available.find((c) => PIVOT_ROW_RE.test(c)) ||
    available[0];
  const colCol =
    (pcol && available.includes(pcol) && pcol !== rowCol && pcol) ||
    available.find((c) => PIVOT_COL_RE.test(c) && c !== rowCol) ||
    available.find((c) => c !== rowCol) ||
    rowCol;

  const recs = await prisma.assetRecord.findMany({
    where: { importId: imp.id },
    select: { data: true },
  });

  const cell = new Map<string, Map<string, number>>();
  const rowTot = new Map<string, number>();
  const colTot = new Map<string, number>();
  for (const r of recs) {
    const data = r.data as Record<string, string>;
    const rk = (data[rowCol] ?? "").trim() || "—";
    const ck = (data[colCol] ?? "").trim() || "—";
    let row = cell.get(rk);
    if (!row) {
      row = new Map();
      cell.set(rk, row);
    }
    row.set(ck, (row.get(ck) ?? 0) + 1);
    rowTot.set(rk, (rowTot.get(rk) ?? 0) + 1);
    colTot.set(ck, (colTot.get(ck) ?? 0) + 1);
  }

  const byCount = (a: [string, number], b: [string, number]) => b[1] - a[1];
  const rowKeys = [...rowTot.entries()].sort(byCount).slice(0, 40).map((e) => e[0]);
  const colKeys = [...colTot.entries()].sort(byCount).slice(0, 14).map((e) => e[0]);

  return {
    available,
    rowCol,
    colCol,
    rowKeys,
    colKeys,
    counts: rowKeys.map((rk) => colKeys.map((ck) => cell.get(rk)?.get(ck) ?? 0)),
    rowTotals: rowKeys.map((rk) => rowTot.get(rk) ?? 0),
    colTotals: colKeys.map((ck) => colTot.get(ck) ?? 0),
    total: recs.length,
  };
}

export interface LocationStat {
  label: string;
  rooms: number;
  pcs: number;
}

/** PCs and rooms per floor plan (location · floor), for the dashboard. */
export async function getLocationStats(): Promise<LocationStat[]> {
  const plans = await prisma.floorPlan.findMany({
    orderBy: [{ building: "asc" }, { floor: "asc" }, { name: "asc" }],
    select: { id: true, name: true, building: true, floor: true, rooms: { select: { number: true } } },
  });
  if (plans.length === 0) return [];

  // Assign each placed room number to the first plan that contains it.
  const normToPlan = new Map<string, string>();
  for (const p of plans) {
    for (const rm of p.rooms) {
      const key = normalizeRoomNumber(rm.number);
      if (!normToPlan.has(key)) normToPlan.set(key, p.id);
    }
  }

  const pcByPlan = new Map<string, number>();
  const imp = await getLatestImport();
  if (imp) {
    const recs = await prisma.assetRecord.findMany({
      where: { importId: imp.id },
      select: { roomNumber: true },
    });
    for (const r of recs) {
      const pid = normToPlan.get(r.roomNumber);
      if (pid) pcByPlan.set(pid, (pcByPlan.get(pid) ?? 0) + 1);
    }
  }

  return plans.map((p) => ({
    label: planLabel(p),
    rooms: p.rooms.length,
    pcs: pcByPlan.get(p.id) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Operating-system breakdown (e.g. Windows 10 vs 11 migration progress)
// ---------------------------------------------------------------------------

export interface BreakdownStat {
  name: string;
  count: number;
}
export interface BreakdownStats {
  column: string;
  total: number;
  top: BreakdownStat[];
}

const OS_COLUMN = /strosname|osname|\bos\b|besturing|operating/i;

/** PCs grouped by operating system (or a similar column), for the dashboard. */
export async function getOsStats(topN = 8): Promise<BreakdownStats | null> {
  const imp = await getLatestImport();
  if (!imp) return null;
  const column = imp.columns.find((c) => OS_COLUMN.test(c));
  if (!column) return null;

  const recs = await prisma.assetRecord.findMany({
    where: { importId: imp.id },
    select: { data: true },
  });
  const map = new Map<string, number>();
  for (const r of recs) {
    const name = ((r.data as Record<string, string>)[column] ?? "").trim() || "— (unknown)";
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  const top = [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
  return { column, total: recs.length, top };
}

// ---------------------------------------------------------------------------
// PC activity (how recently each PC last checked in)
// ---------------------------------------------------------------------------

export interface ActivityStats {
  column: string;
  active: number; // seen in the last 30 days
  recent: number; // 30–90 days
  stale: number; // more than 90 days
  unknown: number; // no / unparseable date
  total: number;
}

const LASTSEEN_COLUMN = /dtmlastcontact|last.?contact|laatste.?contact|last.?seen|laatst/i;

/** Bucket PCs by how long ago they last checked in (from a date column). */
export async function getActivityStats(): Promise<ActivityStats | null> {
  const imp = await getLatestImport();
  if (!imp) return null;
  const column = imp.columns.find((c) => LASTSEEN_COLUMN.test(c));
  if (!column) return null;

  const recs = await prisma.assetRecord.findMany({
    where: { importId: imp.id },
    select: { data: true },
  });
  const now = Date.now();
  const DAY = 86_400_000;
  let active = 0;
  let recent = 0;
  let stale = 0;
  let unknown = 0;
  for (const r of recs) {
    const v = ((r.data as Record<string, string>)[column] ?? "").trim();
    const t = v ? Date.parse(v) : NaN;
    if (Number.isNaN(t)) {
      unknown += 1;
      continue;
    }
    const days = (now - t) / DAY;
    if (days <= 30) active += 1;
    else if (days <= 90) recent += 1;
    else stale += 1;
  }
  return { column, active, recent, stale, unknown, total: recs.length };
}
