import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getAllAssetRows } from "@/lib/assets/queries";
import { buildInitialFilters } from "@/lib/assets/listParams";
import { detectColumn, LASTSEEN_RE } from "@/lib/maps/stats";
import { ACTIVITY_BUCKETS, type ActivityBucket } from "@/lib/assets/activity";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconList, IconImport } from "@/components/icons";
import { AssetTable } from "./AssetTable";

export const dynamic = "force-dynamic";

export default async function AssetListPage({
  searchParams,
}: {
  searchParams: Promise<{
    located?: string;
    q?: string;
    col?: string;
    val?: string;
    col2?: string;
    val2?: string;
    activity?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.MAPS_READ);
  const { located, q, col, val, col2, val2, activity } = await searchParams;
  const initialUnlocated = located === "no";
  const { import: imp, columns, rows } = await getAllAssetRows();
  const initialFilters = buildInitialFilters({ col, val, col2, val2 }, columns);
  const initialQuery = q?.trim() ?? "";
  const lastSeenColumn = detectColumn(columns, LASTSEEN_RE);
  const initialActivity =
    activity && (ACTIVITY_BUCKETS as string[]).includes(activity)
      ? (activity as ActivityBucket)
      : null;

  if (!imp) {
    return (
      <div className="space-y-6">
        <PageHeader title="Asset list" icon={<IconList />} />
        <EmptyState
          icon={<IconImport />}
          title="No asset list imported yet"
          description="An administrator can import one under Admin → Import list."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Asset list"
        icon={<IconList />}
        description={
          <>
            From <span className="font-medium">{imp.filename}</span> · {imp.rowCount} rows.
            Search, filter per column, and sort by clicking a header; rows link to their
            location on the floor plan.
          </>
        }
      />

      <AssetTable
        columns={columns}
        rows={rows}
        roomNumberColumn={imp.roomNumberColumn}
        lastSeenColumn={lastSeenColumn}
        initialUnlocated={initialUnlocated}
        initialFilters={initialFilters}
        initialQuery={initialQuery}
        initialActivity={initialActivity}
      />
    </div>
  );
}
