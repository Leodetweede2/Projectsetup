import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { planLabel } from "@/lib/maps/search";
import { getRecordsForRoom } from "@/lib/assets/queries";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { MapViewer } from "./MapViewer";

export const dynamic = "force-dynamic";

export default async function RoomLocationPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  await requirePermission(PERMISSIONS.MAPS_READ);
  const { roomId } = await params;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      floorPlan: true,
      devices: { orderBy: { name: "asc" }, select: { id: true, name: true, assetTag: true } },
    },
  });
  if (!room) notFound();

  const assets = await getRecordsForRoom(room.number);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/find" className="text-sm text-brand-600 hover:underline">
          ← Back to search
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{room.number}</h1>
          {room.name && <span className="text-slate-600">{room.name}</span>}
          {room.department && <Badge tone="gray">{room.department}</Badge>}
        </div>
        <p className="text-sm text-slate-500">{planLabel(room.floorPlan)}</p>
      </div>

      <Card>
        <CardBody>
          <MapViewer
            imageUrl={`/api/floorplans/${room.floorPlan.id}/image`}
            x={room.x}
            y={room.y}
            label={room.number}
          />
        </CardBody>
      </Card>

      {room.devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>PCs in this room</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-1 text-sm text-slate-700">
              {room.devices.map((d) => (
                <li key={d.id}>
                  {d.name}
                  {d.assetTag && <span className="text-slate-400"> · {d.assetTag}</span>}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {assets.rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>From the asset list ({assets.rows.length})</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <Table>
              <THead>
                <TR>
                  {assets.columns.map((c) => (
                    <TH key={c}>{c}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {assets.rows.map((row, i) => (
                  <TR key={i}>
                    {assets.columns.map((c) => (
                      <TD key={c}>{row[c] ?? ""}</TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
