import { prisma } from "@/lib/db";

/** Clamp a value into the 0..1 range (pin fractions). */
export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Normalise a room number for matching (Excel value ↔ floor-plan pin).
 * Upper-cases and removes whitespace and separators (`_`, `-`, `.`) so that
 * "NC_04-045_a" (PDF) matches "NC_04_045_A" (Excel) and "A0-001" matches "A0_001".
 */
export function normalizeRoomNumber(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[\s._-]/g, "");
}

/**
 * Human label for a plan, e.g. "Molengracht · Floor 1" (falls back to name).
 * The `building` field is used as the location (e.g. a hospital site).
 */
export function planLabel(plan: {
  name: string;
  building?: string | null;
  floor?: string | null;
}): string {
  const parts = [
    plan.building ? plan.building : null,
    plan.floor ? `Floor ${plan.floor}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : plan.name;
}

export interface LocationResult {
  room: {
    id: string;
    number: string;
    name: string | null;
    department: string | null;
    floorPlan: { id: string; name: string; building: string | null; floor: string | null };
  };
  /** Why this room matched the query. */
  matchedBy: "room" | "device" | "asset";
  deviceName?: string;
}

/**
 * Search rooms by number/name/department, plus rooms reachable via a matching
 * device (PC hostname / asset tag). Returns de-duplicated rooms.
 */
export async function searchLocations(query: string): Promise<LocationResult[]> {
  const q = query.trim();
  if (!q) return [];

  const contains = { contains: q, mode: "insensitive" as const };

  const [rooms, devices] = await Promise.all([
    prisma.room.findMany({
      where: { OR: [{ number: contains }, { name: contains }, { department: contains }] },
      include: {
        floorPlan: { select: { id: true, name: true, building: true, floor: true } },
      },
      orderBy: { number: "asc" },
      take: 50,
    }),
    prisma.device.findMany({
      where: { AND: [{ roomId: { not: null } }, { OR: [{ name: contains }, { assetTag: contains }] }] },
      include: {
        room: {
          include: {
            floorPlan: { select: { id: true, name: true, building: true, floor: true } },
          },
        },
      },
      take: 50,
    }),
  ]);

  const byRoomId = new Map<string, LocationResult>();

  for (const room of rooms) {
    byRoomId.set(room.id, { room, matchedBy: "room" });
  }
  for (const device of devices) {
    if (!device.room) continue;
    if (!byRoomId.has(device.room.id)) {
      byRoomId.set(device.room.id, {
        room: device.room,
        matchedBy: "device",
        deviceName: device.name,
      });
    }
  }

  // Also search the imported asset list (the PCs users actually look up), and
  // resolve each matching PC to the placed room with the same room number.
  const imp = await prisma.assetImport.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (imp) {
    const assetRecs = await prisma.assetRecord.findMany({
      where: { importId: imp.id, searchText: { contains: q.toLowerCase() } },
      select: { roomNumber: true },
      take: 200,
    });
    if (assetRecs.length > 0) {
      const wanted = new Set(assetRecs.map((a) => a.roomNumber)); // already normalised
      const placed = await prisma.room.findMany({
        include: {
          floorPlan: { select: { id: true, name: true, building: true, floor: true } },
        },
      });
      for (const room of placed) {
        if (byRoomId.has(room.id)) continue;
        if (wanted.has(normalizeRoomNumber(room.number))) {
          byRoomId.set(room.id, { room, matchedBy: "asset" });
        }
      }
    }
  }

  return [...byRoomId.values()];
}
