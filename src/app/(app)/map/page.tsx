import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { listFloorPlans, getPlanForBrowse } from "@/lib/maps/browse";
import { Card, CardBody } from "@/components/ui/Card";
import { PlanBrowser } from "./PlanBrowser";

export const dynamic = "force-dynamic";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
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

  const { plan: planParam } = await searchParams;
  const planId = plans.some((p) => p.id === planParam) ? planParam! : plans[0].id;
  const plan = await getPlanForBrowse(planId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Map</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse a floor plan, switch between plans, and click a room to see its PCs.
        </p>
      </div>
      {plan && (
        <PlanBrowser
          planId={plan.id}
          planName={plan.name}
          plans={plans}
          rooms={plan.rooms}
        />
      )}
    </div>
  );
}
