import { prisma } from "@/lib/db";
import { normalizeRoomNumber } from "@/lib/maps/search";
import { computeUnmappedRooms, type UnmappedRoom } from "@/lib/maps/stats";

export async function getLatestImport() {
  return prisma.assetImport.findFirst({ orderBy: { createdAt: "desc" } });
}

/** Map of normalised room number → a matching placed Room id (first match). */
export async function getRoomLinkMap(): Promise<Map<string, string>> {
  const rooms = await prisma.room.findMany({ select: { id: true, number: true } });
  const map = new Map<string, string>();
  for (const r of rooms) {
    const key = normalizeRoomNumber(r.number);
    if (!map.has(key)) map.set(key, r.id);
  }
  return map;
}

export interface AssetRow {
  id: string;
  roomNumber: string;
  data: Record<string, string>;
  /** Id of a placed floor-plan room with the same number, if any. */
  roomId: string | null;
}

export async function searchAssetRecords(query: string, take = 300) {
  const imp = await getLatestImport();
  if (!imp) return { import: null, columns: [] as string[], rows: [] as AssetRow[], total: 0 };

  const q = query.trim().toLowerCase();
  const where = { importId: imp.id, ...(q ? { searchText: { contains: q } } : {}) };

  const [records, total, linkMap] = await Promise.all([
    prisma.assetRecord.findMany({ where, take, orderBy: { roomNumber: "asc" } }),
    prisma.assetRecord.count({ where }),
    getRoomLinkMap(),
  ]);

  const rows: AssetRow[] = records.map((r) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    data: r.data as Record<string, string>,
    roomId: linkMap.get(r.roomNumber) ?? null,
  }));

  return { import: imp, columns: imp.columns, rows, total };
}

/** Distinct (already-normalised) room numbers from the latest import. */
export async function getKnownRoomNumbers(): Promise<string[]> {
  const imp = await getLatestImport();
  if (!imp) return [];
  const recs = await prisma.assetRecord.findMany({
    where: { importId: imp.id },
    select: { roomNumber: true },
    distinct: ["roomNumber"],
  });
  return recs.map((r) => r.roomNumber).filter(Boolean);
}

/** All rows of the latest import, with room links — for the interactive table. */
export async function getAllAssetRows(cap = 10000) {
  const imp = await getLatestImport();
  if (!imp) return { import: null, columns: [] as string[], rows: [] as AssetRow[] };

  const [records, linkMap] = await Promise.all([
    prisma.assetRecord.findMany({
      where: { importId: imp.id },
      take: cap,
      orderBy: { roomNumber: "asc" },
      select: { id: true, roomNumber: true, data: true },
    }),
    getRoomLinkMap(),
  ]);

  const rows: AssetRow[] = records.map((r) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    data: r.data as Record<string, string>,
    roomId: linkMap.get(r.roomNumber) ?? null,
  }));
  return { import: imp, columns: imp.columns, rows };
}

export interface ImportMatchSummary {
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  distinctRooms: number;
  matchedRooms: number;
  /** Room numbers present in the list but not on any plan, biggest first. */
  unplaced: UnmappedRoom[];
}

/**
 * How well the latest import lines up with the placed floor-plan pins: how many
 * rows/room numbers match a pin, and which room numbers are still unplaced.
 */
export async function getImportMatchSummary(): Promise<ImportMatchSummary | null> {
  const imp = await getLatestImport();
  if (!imp) return null;

  const [records, rooms] = await Promise.all([
    prisma.assetRecord.findMany({
      where: { importId: imp.id },
      select: { roomNumber: true, data: true },
    }),
    prisma.room.findMany({ select: { number: true } }),
  ]);

  const roomNorms = new Set(rooms.map((r) => normalizeRoomNumber(r.number)));
  const recLite = records.map((r) => ({
    roomNumber: r.roomNumber,
    data: r.data as Record<string, string>,
  }));

  const distinct = new Set<string>();
  const matchedDistinct = new Set<string>();
  let matchedRows = 0;
  for (const r of recLite) {
    distinct.add(r.roomNumber);
    if (roomNorms.has(r.roomNumber)) {
      matchedRows += 1;
      matchedDistinct.add(r.roomNumber);
    }
  }

  return {
    totalRows: recLite.length,
    matchedRows,
    unmatchedRows: recLite.length - matchedRows,
    distinctRooms: distinct.size,
    matchedRooms: matchedDistinct.size,
    unplaced: computeUnmappedRooms(recLite, roomNorms, imp.roomNumberColumn, 200),
  };
}

/** Excel rows whose room number matches a given room, for the map viewer. */
export async function getRecordsForRoom(roomNumber: string) {
  const imp = await getLatestImport();
  if (!imp) return { columns: [] as string[], rows: [] as Record<string, string>[] };
  const key = normalizeRoomNumber(roomNumber);
  const records = await prisma.assetRecord.findMany({
    where: { importId: imp.id, roomNumber: key },
  });
  return { columns: imp.columns, rows: records.map((r) => r.data as Record<string, string>) };
}
