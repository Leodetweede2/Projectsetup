import { prisma } from "@/lib/db";
import { normalizeRoomNumber } from "@/lib/maps/search";

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
