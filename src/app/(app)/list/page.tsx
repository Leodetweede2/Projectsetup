import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getAllAssetRows } from "@/lib/assets/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconList, IconImport } from "@/components/icons";
import { AssetTable } from "./AssetTable";

export const dynamic = "force-dynamic";

export default async function AssetListPage({
  searchParams,
}: {
  searchParams: Promise<{ located?: string }>;
}) {
  await requirePermission(PERMISSIONS.MAPS_READ);
  const { located } = await searchParams;
  const initialUnlocated = located === "no";
  const { import: imp, columns, rows } = await getAllAssetRows();

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
        initialUnlocated={initialUnlocated}
      />
    </div>
  );
}
