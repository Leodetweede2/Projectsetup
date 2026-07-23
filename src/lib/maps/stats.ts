/**
 * Pure, dependency-free dashboard statistics.
 *
 * These functions take plain in-memory data (asset rows, room numbers, plans)
 * and compute the numbers the dashboard shows. Keeping them free of Prisma makes
 * them fast (one DB fetch feeds all of them) and easy to unit-test.
 */

import { normalizeRoomNumber } from "./search";
import { activityBucket } from "@/lib/assets/activity";

export type AssetData = Record<string, string>;
export interface AssetRecordLite {
  roomNumber: string; // already normalised (as stored on import)
  data: AssetData;
}

// Column-name heuristics for auto-detecting which asset column is what.
export const DEPARTMENT_RE = /afdeling|afdeeling|department|dept|\bafd\b/i;
export const OS_RE = /strosname|osname|\bos\b|besturing|operating/i;
export const LASTSEEN_RE = /dtmlastcontact|last.?contact|laatste.?contact|last.?seen|laatst/i;
export const PIVOT_ROW_RE = DEPARTMENT_RE;
export const PIVOT_COL_RE = /strosname|osname|\bos\b|besturing|type|status/i;

/** First column whose header matches the pattern, or null. */
export function detectColumn(columns: string[], re: RegExp): string | null {
  return columns.find((c) => re.test(c)) ?? null;
}

// ---------------------------------------------------------------------------

export interface DashboardStats {
  floorPlans: number;
  rooms: number;
  roomsWithPcs: number;
  pcsTotal: number;
  pcsLocated: number;
  pcsUnlocated: number;
  locatedPct: number;
}

export interface RoomLite {
  number: string;
}

/** High-level counts (PCs located, rooms with PCs, etc.). */
export function computeCore(input: {
  floorPlans: number;
  rooms: RoomLite[];
  roomNorms: Set<string>;
  assetRoomNumbers: string[];
}): DashboardStats {
  const { floorPlans, rooms, roomNorms, assetRoomNumbers } = input;
  const assetNorms = new Set(assetRoomNumbers);

  const pcsTotal = assetRoomNumbers.length;
  let pcsLocated = 0;
  for (const n of assetRoomNumbers) if (roomNorms.has(n)) pcsLocated += 1;

  const roomsWithPcs = rooms.filter((r) =>
    assetNorms.has(normalizeRoomNumber(r.number)),
  ).length;

  return {
    floorPlans,
    rooms: rooms.length,
    roomsWithPcs,
    pcsTotal,
    pcsLocated,
    pcsUnlocated: pcsTotal - pcsLocated,
    locatedPct: pcsTotal ? Math.round((pcsLocated / pcsTotal) * 100) : 0,
  };
}

// ---------------------------------------------------------------------------

export interface DepartmentStat {
  name: string;
  total: number;
  located: number;
}
export interface DepartmentStats {
  column: string | null;
  count: number;
  top: DepartmentStat[];
}

/** Per-department PC counts and how many of them are placed on a plan. */
export function computeDepartment(
  records: AssetRecordLite[],
  column: string | null,
  roomNorms: Set<string>,
  topN = 8,
): DepartmentStats {
  if (!column) return { column: null, count: 0, top: [] };
  const map = new Map<string, DepartmentStat>();
  for (const r of records) {
    const name = (r.data[column] ?? "").trim() || "— (unknown)";
    const entry = map.get(name) ?? { name, total: 0, located: 0 };
    entry.total += 1;
    if (roomNorms.has(r.roomNumber)) entry.located += 1;
    map.set(name, entry);
  }
  const top = [...map.values()].sort((a, b) => b.total - a.total).slice(0, topN);
  return { column, count: map.size, top };
}

// ---------------------------------------------------------------------------

export interface PivotStats {
  available: string[];
  rowCol: string;
  colCol: string;
  rowKeys: string[];
  colKeys: string[];
  counts: number[][];
  rowTotals: number[];
  colTotals: number[];
  total: number;
}

/** Cross-tabulate asset rows by two columns (a pivot table). */
export function computePivot(
  data: AssetData[],
  available: string[],
  prow?: string,
  pcol?: string,
): PivotStats | null {
  if (available.length === 0) return null;

  const rowCol =
    (prow && available.includes(prow) && prow) ||
    detectColumn(available, PIVOT_ROW_RE) ||
    available[0];
  const colCol =
    (pcol && available.includes(pcol) && pcol !== rowCol && pcol) ||
    available.find((c) => PIVOT_COL_RE.test(c) && c !== rowCol) ||
    available.find((c) => c !== rowCol) ||
    rowCol;

  const cell = new Map<string, Map<string, number>>();
  const rowTot = new Map<string, number>();
  const colTot = new Map<string, number>();
  for (const d of data) {
    const rk = (d[rowCol] ?? "").trim() || "—";
    const ck = (d[colCol] ?? "").trim() || "—";
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
    total: data.length,
  };
}

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

/** PCs grouped by the values of a single column (e.g. operating system). */
export function computeBreakdown(
  data: AssetData[],
  column: string,
  topN = 8,
): BreakdownStats {
  const map = new Map<string, number>();
  for (const d of data) {
    const name = (d[column] ?? "").trim() || "— (unknown)";
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  const top = [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
  return { column, total: data.length, top };
}

// ---------------------------------------------------------------------------

export interface ActivityStats {
  column: string;
  active: number; // seen in the last 30 days
  recent: number; // 30–90 days
  stale: number; // more than 90 days
  unknown: number; // no / unparseable date
  total: number;
}

/** Bucket PCs by how long ago they last checked in (from a date column). */
export function computeActivity(
  data: AssetData[],
  column: string,
  now = Date.now(),
): ActivityStats {
  let active = 0;
  let recent = 0;
  let stale = 0;
  let unknown = 0;
  for (const d of data) {
    switch (activityBucket(d[column], now)) {
      case "active":
        active += 1;
        break;
      case "recent":
        recent += 1;
        break;
      case "stale":
        stale += 1;
        break;
      default:
        unknown += 1;
    }
  }
  return { column, active, recent, stale, unknown, total: data.length };
}

// ---------------------------------------------------------------------------

export interface LocationStat {
  id: string;
  label: string;
  rooms: number;
  pcs: number;
}
export interface PlanLite {
  id: string;
  label: string;
  /** Normalised room numbers on this plan. */
  roomNorms: string[];
}

/** PCs and rooms per plan; each asset PC counts toward the first plan it fits. */
export function computeLocations(
  plans: PlanLite[],
  assetRoomNumbers: string[],
): LocationStat[] {
  const normToPlan = new Map<string, number>();
  plans.forEach((p, i) => {
    for (const key of p.roomNorms) if (!normToPlan.has(key)) normToPlan.set(key, i);
  });

  const pcByPlan = new Array(plans.length).fill(0);
  for (const n of assetRoomNumbers) {
    const idx = normToPlan.get(n);
    if (idx !== undefined) pcByPlan[idx] += 1;
  }

  return plans.map((p, i) => ({
    id: p.id,
    label: p.label,
    rooms: p.roomNorms.length,
    pcs: pcByPlan[i],
  }));
}

// ---------------------------------------------------------------------------
// Coverage gaps — where are the devices we can't locate yet?
// ---------------------------------------------------------------------------

export interface DeptCoverage {
  name: string;
  total: number;
  located: number;
  unplaced: number;
}
export interface DepartmentCoverage {
  column: string | null;
  rows: DeptCoverage[];
}

/**
 * Per-department PC totals with how many are placed vs. still unplaced, ranked
 * by the number of unplaced PCs (the biggest coverage gaps first).
 */
export function computeDepartmentCoverage(
  records: AssetRecordLite[],
  column: string | null,
  roomNorms: Set<string>,
  topN = 20,
): DepartmentCoverage {
  if (!column) return { column: null, rows: [] };
  const map = new Map<string, DeptCoverage>();
  for (const r of records) {
    const name = (r.data[column] ?? "").trim() || "— (unknown)";
    const e = map.get(name) ?? { name, total: 0, located: 0, unplaced: 0 };
    e.total += 1;
    if (roomNorms.has(r.roomNumber)) e.located += 1;
    else e.unplaced += 1;
    map.set(name, e);
  }
  const rows = [...map.values()]
    .sort((a, b) => b.unplaced - a.unplaced || b.total - a.total)
    .slice(0, topN);
  return { column, rows };
}

export interface UnmappedRoom {
  /** Normalised key (may be "" for rows without a room number). */
  key: string;
  /** Human-friendly room number to show (original value, or a placeholder). */
  label: string;
  count: number;
}

/**
 * Room numbers present in the asset list that don't match any floor-plan pin,
 * with how many PCs sit behind each — the actionable "map these next" list.
 * Rows with no room number at all are grouped under a single placeholder.
 */
export function computeUnmappedRooms(
  records: AssetRecordLite[],
  roomNorms: Set<string>,
  roomNumberColumn: string | null,
  topN = 12,
): UnmappedRoom[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const r of records) {
    if (roomNorms.has(r.roomNumber)) continue; // already placed
    const key = r.roomNumber;
    const raw = roomNumberColumn ? (r.data[roomNumberColumn] ?? "").trim() : "";
    const label = raw || (key ? key : "(no room number)");
    const e = map.get(key) ?? { label, count: 0 };
    e.count += 1;
    map.set(key, e);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
