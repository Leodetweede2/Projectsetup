import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getDashboardData } from "@/lib/maps/browse";
import { listDrillHref } from "@/lib/assets/listParams";
import { formatTimeAgo, daysSince } from "@/lib/format";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { StatTile } from "@/components/ui/StatTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconChevronRight, IconCpu, IconMap, IconBuilding, IconUsers, IconFloorplan, IconList, IconClock, IconImport } from "@/components/icons";
import { Pivot } from "./Pivot";

/** A value is a real category (not the "unknown/empty" placeholder). */
const isRealValue = (v: string) => !!v && !v.startsWith("—");

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ prow?: string; pcol?: string }>;
}) {
  const user = await requireUser();
  const canSeeMaps = hasPermission(user, PERMISSIONS.MAPS_READ);
  const { prow, pcol } = await searchParams;
  const dash = canSeeMaps ? await getDashboardData(prow, pcol) : null;
  const stats = dash?.stats ?? null;
  const deptStats = dash?.department ?? null;
  const pivot = dash?.pivot ?? null;
  const locations = dash?.locations ?? null;
  const osStats = dash?.os ?? null;
  const activity = dash?.activity ?? null;
  const dataset = dash?.dataset ?? null;
  const datasetStale = dataset ? daysSince(dataset.importedAt) > 30 : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.name}`}
        description={`You are signed in as ${user.email}.`}
      />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatTile
            label="PCs with a location"
            value={`${stats.pcsLocated} / ${stats.pcsTotal}`}
            sub={`${stats.locatedPct}% of the asset list is placed on a floor plan`}
            tone="brand"
            icon={<IconCpu />}
          />
          <StatTile
            label="PCs without a location"
            value={stats.pcsUnlocated}
            sub={stats.pcsUnlocated > 0 ? "View which PCs these are" : "All PCs are placed"}
            tone={stats.pcsUnlocated > 0 ? "amber" : "green"}
            href={stats.pcsUnlocated > 0 ? "/list?located=no" : undefined}
            icon={<IconMap />}
          />
          <StatTile
            label="Rooms with PCs"
            value={`${stats.roomsWithPcs} / ${stats.rooms}`}
            sub="Pinned rooms that have at least one PC"
            tone="slate"
            icon={<IconBuilding />}
          />
          {deptStats?.column && (
            <StatTile
              label="Departments"
              value={deptStats.count}
              sub={`Distinct values in "${deptStats.column}"`}
              tone="slate"
              icon={<IconUsers />}
            />
          )}
          <StatTile label="Floor plans" value={stats.floorPlans} sub="Uploaded plans" tone="slate" icon={<IconFloorplan />} />
          <StatTile label="Rooms mapped" value={stats.rooms} sub="Pins across all plans" tone="slate" icon={<IconMap />} />
          {activity && (
            <StatTile
              label="Inactive PCs (90+ days)"
              value={activity.stale}
              sub={`Not seen in "${activity.column}"`}
              tone={activity.stale > 0 ? "amber" : "green"}
              icon={<IconClock />}
            />
          )}
          {osStats && (
            <StatTile
              label="Operating systems"
              value={osStats.top.length}
              sub={`Distinct values in "${osStats.column}"`}
              tone="slate"
              icon={<IconList />}
            />
          )}
          {dataset && (
            <StatTile
              label="Asset list"
              value={`${dataset.rowCount} rows`}
              sub={`${dataset.filename} · imported ${formatTimeAgo(dataset.importedAt)}`}
              tone={datasetStale ? "amber" : "slate"}
              icon={<IconImport />}
              href="/list"
            />
          )}
        </div>
      )}

      {datasetStale && dataset && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          The asset list was last imported {formatTimeAgo(dataset.importedAt)}. Re-export from
          SharePoint and re-import it under <span className="font-medium">Admin → Import list</span>{" "}
          to keep locations accurate.
        </div>
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
                    const drillable = isRealValue(o.name);
                    const bar = (
                      <div className="space-y-1">
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
                      </div>
                    );
                    return (
                      <li key={o.name}>
                        {drillable ? (
                          <Link
                            href={listDrillHref([{ col: osStats.column, val: o.name }])}
                            className="-mx-2 block rounded-md px-2 py-1 transition-colors hover:bg-surface-2"
                            title={`Show ${o.name} PCs in the asset list`}
                          >
                            {bar}
                          </Link>
                        ) : (
                          bar
                        )}
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
                {locations.map((l) => (
                  <TR key={l.id}>
                    <TD className="font-medium text-ink">
                      <Link
                        href={`/map?plan=${l.id}`}
                        className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                        title={`Open ${l.label} on the map`}
                      >
                        {l.label}
                        <IconChevronRight width={14} height={14} />
                      </Link>
                    </TD>
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
