import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { planLabel } from "@/lib/maps/search";
import { getImportMatchSummary } from "@/lib/assets/queries";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconFloorplan } from "@/components/icons";
import { PinEditor } from "./PinEditor";

export const dynamic = "force-dynamic";

export default async function FloorPlanEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.MAPS_WRITE);
  const { id } = await params;

  const [plan, summary] = await Promise.all([
    prisma.floorPlan.findUnique({
      where: { id },
      include: { rooms: { orderBy: { number: "asc" } } },
    }),
    getImportMatchSummary(),
  ]);
  if (!plan) notFound();

  const unplaced = (summary?.unplaced ?? []).filter((r) => r.key); // skip blank room numbers

  return (
    <div className="space-y-6">
      <PageHeader
        title={plan.name}
        icon={<IconFloorplan />}
        description={planLabel(plan)}
        back={{ href: "/admin/floorplans", label: "Back to floor plans" }}
      />

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
            }))}
            unplaced={unplaced.map((r) => ({ label: r.label, count: r.count }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}
