import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { normalizeRoomNumber } from "@/lib/maps/search";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MAX_ROWS = 20000;

interface ImportBody {
  filename?: string;
  roomNumberColumn?: string;
  columns?: string[];
  rows?: Array<Record<string, unknown>>;
}

/**
 * Replace the current asset list with a freshly-parsed Excel export. The client
 * parses the .xlsx (SheetJS) and posts the columns + rows here, plus which
 * column holds the room number (used to link rows to floor-plan pins).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!hasPermission(user, PERMISSIONS.MAPS_WRITE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as ImportBody;
    const filename = String(body.filename ?? "import.xlsx").slice(0, 200);
    const columns = Array.isArray(body.columns) ? body.columns.map(String) : [];
    const roomNumberColumn = String(body.roomNumberColumn ?? "");
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (columns.length === 0) {
      return NextResponse.json({ error: "No columns found in the file." }, { status: 400 });
    }
    if (!columns.includes(roomNumberColumn)) {
      return NextResponse.json(
        { error: "The selected room-number column is not one of the file's columns." },
        { status: 400 },
      );
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: "The file has no rows." }, { status: 400 });
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Too many rows (max ${MAX_ROWS}).` },
        { status: 400 },
      );
    }

    const records = rows.map((row) => {
      const data: Record<string, string> = {};
      for (const col of columns) {
        const v = row[col];
        data[col] = v == null ? "" : String(v);
      }
      return {
        roomNumber: normalizeRoomNumber(row[roomNumberColumn]),
        data,
        searchText: Object.values(data).join(" ").toLowerCase(),
      };
    });

    const importId = await prisma.$transaction(async (tx) => {
      // Keep only the latest import.
      await tx.assetImport.deleteMany({});
      const created = await tx.assetImport.create({
        data: {
          filename,
          roomNumberColumn,
          columns,
          rowCount: records.length,
          createdById: user!.id,
        },
      });
      await tx.assetRecord.createMany({
        data: records.map((r) => ({ ...r, importId: created.id })),
      });
      return created.id;
    });

    await logAudit({
      action: AUDIT_ACTIONS.ASSET_LIST_IMPORTED,
      actorUserId: user!.id,
      targetType: "asset_import",
      targetId: importId,
      metadata: { filename, rowCount: records.length, roomNumberColumn },
    });

    return NextResponse.json({ importId, rowCount: records.length });
  } catch (err) {
    console.error("Asset import failed:", err);
    const message = err instanceof Error ? err.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
