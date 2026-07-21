import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getLatestImport } from "@/lib/assets/queries";
import { clearAssetListAction } from "@/lib/assets/actions";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ImportAssetList } from "./ImportAssetList";

export const dynamic = "force-dynamic";

export default async function AdminAssetsPage() {
  await requirePermission(PERMISSIONS.MAPS_WRITE);
  const current = await getLatestImport();

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Asset list (Excel import)</h1>

      <Card>
        <CardHeader>
          <CardTitle>Current list</CardTitle>
        </CardHeader>
        <CardBody>
          {current ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 text-sm">
                <p className="font-medium text-ink">{current.filename}</p>
                <p className="text-ink-faint">
                  {current.rowCount} rows · room-number column:{" "}
                  <Badge tone="blue">{current.roomNumberColumn}</Badge>
                </p>
                <p className="text-ink-faint">
                  Imported {current.createdAt.toISOString().slice(0, 16).replace("T", " ")} ·{" "}
                  <Link href="/list" className="text-brand-600 hover:underline">
                    open overview
                  </Link>
                </p>
              </div>
              <form action={clearAssetListAction}>
                <Button type="submit" variant="danger" size="sm">
                  Clear list
                </Button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-ink-faint">
              No list imported yet. Upload your Excel export below.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import an Excel export</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-ink-faint">
            Export your SharePoint list to Excel and upload it here. Pick the column that
            holds the room number so rows can be linked to the floor-plan pins. Re-upload
            whenever the list changes.
          </p>
          <ImportAssetList />
        </CardBody>
      </Card>
    </div>
  );
}
