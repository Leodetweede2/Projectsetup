import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { listFloorPlans, getPlanForBrowse } from "@/lib/maps/browse";
import { searchLocations, planLabel } from "@/lib/maps/search";
import { Card, CardBody } from "@/components/ui/Card";
import { PlanBrowser, type SearchResult } from "./PlanBrowser";

export const dynamic = "force-dynamic";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; room?: string; q?: string }>;
}) {
  await requirePermission(PERMISSIONS.MAPS_READ);
  const plans = await listFloorPlans();

  if (plans.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Map</h1>
        <Card>
          <CardBody className="text-slate-500">
            No floor plans yet. An administrator can upload one under Admin → Floor plans.
          </CardBody>
        </Card>
      </div>
    );
  }

  const { plan: planParam, room: roomParam, q } = await searchParams;
  const query = q?.trim() ?? "";

  const results = query ? await searchLocations(query) : [];
  const searchResults: SearchResult[] = results.map((r) => ({
    roomId: r.room.id,
    number: r.room.number,
    planLabel: planLabel(r.room.floorPlan),
    matchedBy: r.matchedBy,
    deviceName: r.deviceName,
  }));

  // Resolve which room/plan to show: an explicit ?room, else the top search hit.
  let targetRoomId: string | null = roomParam ?? results[0]?.room.id ?? null;
  let planId: string | null = null;
  if (targetRoomId) {
    const rm = await prisma.room.findUnique({
      where: { id: targetRoomId },
      select: { floorPlanId: true },
    });
    planId = rm?.floorPlanId ?? null;
    if (!rm) targetRoomId = null;
  }
  if (!planId) planId = planParam && plans.some((p) => p.id === planParam) ? planParam : plans[0].id;

  const plan = await getPlanForBrowse(planId);
  const initialRoomId =
    targetRoomId && plan?.rooms.some((r) => r.id === targetRoomId) ? targetRoomId : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Map</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search a PC or room, browse the floor plan, and click a pin to see the PCs in that
          room.
        </p>
      </div>
      {plan && (
        <PlanBrowser
          planId={plan.id}
          planName={plan.name}
          plans={plans}
          rooms={plan.rooms}
          assetColumns={plan.assetColumns}
          assetRoomColumn={plan.assetRoomColumn}
          query={query}
          searchResults={searchResults}
          initialRoomId={initialRoomId}
        />
      )}
    </div>
  );
}
