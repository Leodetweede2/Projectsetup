import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { planLabel } from "@/lib/maps/search";
import { Card, CardBody } from "@/components/ui/Card";
import { PinEditor } from "./PinEditor";

export const dynamic = "force-dynamic";

export default async function FloorPlanEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.MAPS_WRITE);
  const { id } = await params;

  const plan = await prisma.floorPlan.findUnique({
    where: { id },
    include: {
      rooms: {
        orderBy: { number: "asc" },
        include: {
          devices: { orderBy: { name: "asc" }, select: { id: true, name: true, assetTag: true } },
        },
      },
    },
  });
  if (!plan) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/floorplans" className="text-sm text-brand-600 hover:underline">
          ← Back to floor plans
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{plan.name}</h1>
        <p className="text-sm text-slate-500">{planLabel(plan)}</p>
      </div>

      <Card>
        <CardBody>
          <PinEditor
            plan={{ id: plan.id, name: plan.name }}
            rooms={plan.rooms.map((r) => ({
              id: r.id,
              number: r.number,
              name: r.name,
              department: r.department,
              x: r.x,
              y: r.y,
              devices: r.devices,
            }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}
