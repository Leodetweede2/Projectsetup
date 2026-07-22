import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  getDashboardStats,
  getDepartmentStats,
  getPivotStats,
  getLocationStats,
  getOsStats,
  getActivityStats,
} from "@/lib/maps/browse";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { StatTile } from "@/components/ui/StatTile";
import { Pivot } from "./Pivot";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ prow?: string; pcol?: string }>;
}) {
  const user = await requireUser();
  const canSeeMaps = hasPermission(user, PERMISSIONS.MAPS_READ);
  const { prow, pcol } = await searchParams;
  const [stats, deptStats, pivot, locations, osStats, activity] = canSeeMaps
    ? await Promise.all([
        getDashboardStats(),
        getDepartmentStats(),
        getPivotStats(prow, pcol),
        getLocationStats(),
        getOsStats(),
        getActivityStats(),
      ])
    : [null, null, null, null, null, null];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-ink-faint">You are signed in as {user.email}.</p>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatTile
            label="PCs with a location"
            value={`${stats.pcsLocated} / ${stats.pcsTotal}`}
            sub={`${stats.locatedPct}% of the asset list is placed on a floor plan`}
            tone="brand"
          />
          <StatTile
            label="PCs without a location"
            value={stats.pcsUnlocated}
            sub={stats.pcsUnlocated > 0 ? "View which PCs these are" : "All PCs are placed"}
            tone={stats.pcsUnlocated > 0 ? "amber" : "green"}
            href={stats.pcsUnlocated > 0 ? "/list?located=no" : undefined}
          />
          <StatTile
            label="Rooms with PCs"
            value={`${stats.roomsWithPcs} / ${stats.rooms}`}
            sub="Pinned rooms that have at least one PC"
            tone="slate"
          />
          {deptStats?.column && (
            <StatTile
              label="Departments"
              value={deptStats.count}
              sub={`Distinct values in "${deptStats.column}"`}
              tone="slate"
            />
          )}
          <StatTile label="Floor plans" value={stats.floorPlans} sub="Uploaded plans" tone="slate" />
          <StatTile label="Rooms mapped" value={stats.rooms} sub="Pins across all plans" tone="slate" />
          <StatTile
            label="Manually linked PCs"
            value={stats.devices}
            sub="Devices attached to a room by hand"
            tone="slate"
          />
          {activity && (
            <StatTile
              label="Inactive PCs (90+ days)"
              value={activity.stale}
              sub={`Not seen in "${activity.column}"`}
              tone={activity.stale > 0 ? "amber" : "green"}
            />
          )}
          {osStats && (
            <StatTile
              label="Operating systems"
              value={osStats.top.length}
              sub={`Distinct values in "${osStats.column}"`}
              tone="slate"
            />
          )}
        </div>
      )}

      {deptStats?.column && deptStats.top.length > 0 && (
        <Card>
          <CardHeader className="flex items-center justify-between gap-4">
            <CardTitle>PCs by department</CardTitle>
            <span className="text-xs text-ink-faint">
              Top {deptStats.top.length} of {deptStats.count} · bar = share placed on a plan
            </span>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3">
              {deptStats.top.map((d) => {
                const pct = d.total ? Math.round((d.located / d.total) * 100) : 0;
                return (
                  <li key={d.name} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-ink" title={d.name}>
                        {d.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-ink-faint">
                        {d.located} / {d.total} located · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      {(osStats || activity) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {osStats && osStats.top.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>By operating system</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="space-y-3">
                  {osStats.top.map((o) => {
                    const pct = osStats.total ? Math.round((o.count / osStats.total) * 100) : 0;
                    return (
                      <li key={o.name} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-ink" title={o.name}>
                            {o.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-ink-faint">
                            {o.count} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          )}

          {activity && (
            <Card>
              <CardHeader className="flex items-center justify-between gap-4">
                <CardTitle>PC activity (last seen)</CardTitle>
                <span className="text-xs text-ink-faint">from &quot;{activity.column}&quot;</span>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
                  {(
                    [
                      ["bg-green-500", activity.active],
                      ["bg-brand-400", activity.recent],
                      ["bg-amber-500", activity.stale],
                      ["bg-slate-400", activity.unknown],
                    ] as const
                  ).map(([cls, n], i) =>
                    n > 0 ? (
                      <div
                        key={i}
                        className={cls}
                        style={{ width: `${(n / Math.max(1, activity.total)) * 100}%` }}
                      />
                    ) : null,
                  )}
                </div>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  {(
                    [
                      ["Active (≤30 days)", activity.active, "bg-green-500"],
                      ["30–90 days", activity.recent, "bg-brand-400"],
                      ["Inactive (90+ days)", activity.stale, "bg-amber-500"],
                      ["Unknown / no date", activity.unknown, "bg-slate-400"],
                    ] as const
                  ).map(([label, n, cls]) => (
                    <li key={label} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-ink-muted">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />
                        {label}
                      </span>
                      <span className="tabular-nums font-medium text-ink">{n}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {pivot && (
        <Card>
          <CardHeader>
            <CardTitle>Pivot table</CardTitle>
          </CardHeader>
          <CardBody id="pivot">
            <Pivot stats={pivot} />
          </CardBody>
        </Card>
      )}

      {locations && locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>PCs per location</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Location · floor</TH>
                  <TH className="text-right">Rooms</TH>
                  <TH className="text-right">PCs</TH>
                </TR>
              </THead>
              <TBody>
                {locations.map((l, i) => (
                  <TR key={i}>
                    <TD className="font-medium text-ink">{l.label}</TD>
                    <TD className="text-right tabular-nums">{l.rooms}</TD>
                    <TD className="text-right tabular-nums">{l.pcs}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {canSeeMaps && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/map"
            className="block rounded-xl border border-brand-300 bg-brand-50 p-5 shadow-sm transition-colors hover:border-brand-400 dark:border-brand-500/40 dark:bg-brand-500/10 dark:hover:border-brand-500/60"
          >
            <h2 className="text-lg font-semibold text-brand-900 dark:text-brand-200">
              Open the map
            </h2>
            <p className="mt-0.5 text-sm text-brand-700 dark:text-brand-300/80">
              Browse a floor plan, search a PC, and see where it is.
            </p>
          </Link>
          <Link
            href="/list"
            className="block rounded-xl border border-line bg-surface p-5 shadow-sm transition-colors hover:border-brand-300"
          >
            <h2 className="text-lg font-semibold text-ink">Asset list</h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              Search, filter and sort the imported PC list.
            </p>
          </Link>
        </div>
      )}
    </div>
  );
}
