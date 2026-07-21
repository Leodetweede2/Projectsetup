import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getAllAssetRows } from "@/lib/assets/queries";
import { Card, CardBody } from "@/components/ui/Card";
import { AssetTable } from "./AssetTable";

export const dynamic = "force-dynamic";

export default async function AssetListPage() {
  await requirePermission(PERMISSIONS.MAPS_READ);
  const { import: imp, columns, rows } = await getAllAssetRows();

  if (!imp) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-ink">Asset list</h1>
        <Card>
          <CardBody className="text-ink-faint">
            No asset list has been imported yet. An administrator can import one under
            Admin → Import list.
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Asset list</h1>
        <p className="mt-1 text-sm text-ink-faint">
          From <span className="font-medium">{imp.filename}</span> · {imp.rowCount} rows.
          Search, filter per column, and sort by clicking a header; rows link to their
          location on the floor plan.
        </p>
      </div>

      <AssetTable columns={columns} rows={rows} roomNumberColumn={imp.roomNumberColumn} />
    </div>
  );
}
