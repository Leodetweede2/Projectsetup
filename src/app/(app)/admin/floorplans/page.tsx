import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { deleteFloorPlanAction } from "@/lib/maps/actions";
import { planLabel } from "@/lib/maps/search";
import { getKnownRoomNumbers } from "@/lib/assets/queries";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconFloorplan } from "@/components/icons";
import { UploadFloorPlan } from "./UploadFloorPlan";

export const dynamic = "force-dynamic";

export default async function FloorPlansPage() {
  await requirePermission(PERMISSIONS.MAPS_WRITE);

  const [plans, knownRoomNumbers] = await Promise.all([
    prisma.floorPlan.findMany({
      orderBy: [{ building: "asc" }, { floor: "asc" }, { name: "asc" }],
      include: { _count: { select: { rooms: true } } },
    }),
    getKnownRoomNumbers(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Floor plans"
        icon={<IconFloorplan />}
        description="Upload plans and place room pins."
      />

      <Card>
        <CardHeader>
          <CardTitle>Upload a floor plan (PDF)</CardTitle>
        </CardHeader>
        <CardBody>
          <UploadFloorPlan knownRoomNumbers={knownRoomNumbers} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All floor plans</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Location</TH>
                <TH>Rooms</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {plans.map((plan) => (
                <TR key={plan.id}>
                  <TD className="font-medium text-ink">{plan.name}</TD>
                  <TD className="text-ink-muted">{planLabel(plan)}</TD>
                  <TD>
                    <Badge tone="gray">{plan._count.rooms}</Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/floorplans/${plan.id}`}>
                        <Button variant="secondary" size="sm">
                          Edit pins
                        </Button>
                      </Link>
                      <form action={deleteFloorPlanAction}>
                        <input type="hidden" name="id" value={plan.id} />
                        <Button type="submit" variant="danger" size="sm">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </TD>
                </TR>
              ))}
              {plans.length === 0 && (
                <TR>
                  <TD colSpan={4} className="py-8 text-center text-ink-faint">
                    No floor plans yet. Upload one above.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
