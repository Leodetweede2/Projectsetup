import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getDashboardStats } from "@/lib/maps/browse";
import { Card, CardBody } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const canSeeMaps = hasPermission(user, PERMISSIONS.MAPS_READ);
  const stats = canSeeMaps ? await getDashboardStats() : null;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-slate-500">You are signed in as {user.email}.</p>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label="PCs with a location"
            value={`${stats.pcsLocated} / ${stats.pcsTotal}`}
            sub={`${stats.locatedPct}% of the asset list is placed on a floor plan`}
            tone="brand"
          />
          <StatTile
            label="PCs without a location"
            value={stats.pcsUnlocated}
            sub="No matching room pin yet"
            tone={stats.pcsUnlocated > 0 ? "amber" : "green"}
          />
          <StatTile
            label="Rooms with PCs"
            value={`${stats.roomsWithPcs} / ${stats.rooms}`}
            sub="Pinned rooms that have at least one PC"
            tone="slate"
          />
          <StatTile label="Floor plans" value={stats.floorPlans} sub="Uploaded plans" tone="slate" />
          <StatTile label="Rooms mapped" value={stats.rooms} sub="Pins across all plans" tone="slate" />
          <StatTile
            label="Manually linked PCs"
            value={stats.devices}
            sub="Devices attached to a room by hand"
            tone="slate"
          />
        </div>
      )}

      {canSeeMaps && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/map" className="block">
            <Card className="border-brand-200 bg-brand-50 transition-colors hover:border-brand-300">
              <CardBody>
                <h2 className="text-lg font-semibold text-brand-900">Open the map</h2>
                <p className="text-sm text-brand-700">
                  Browse a floor plan, search a PC, and see where it is.
                </p>
              </CardBody>
            </Card>
          </Link>
          <Link href="/list" className="block">
            <Card className="transition-colors hover:border-brand-300">
              <CardBody>
                <h2 className="text-lg font-semibold text-slate-900">Asset list</h2>
                <p className="text-sm text-slate-500">
                  Search, filter and sort the imported PC list.
                </p>
              </CardBody>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
