import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getLatestImport, getImportMatchSummary } from "@/lib/assets/queries";
import { clearAssetListAction } from "@/lib/assets/actions";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconImport } from "@/components/icons";
import { ImportAssetList } from "./ImportAssetList";

export const dynamic = "force-dynamic";

export default async function AdminAssetsPage() {
  await requirePermission(PERMISSIONS.MAPS_WRITE);
  const current = await getLatestImport();
  const summary = current ? await getImportMatchSummary() : null;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Asset list (Excel import)"
        icon={<IconImport />}
        description="Import the SharePoint export that links PCs to rooms."
      />

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

      {summary && summary.totalRows > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Match quality</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-bold text-ink">
                  {summary.matchedRows}
                  <span className="text-base font-medium text-ink-faint"> / {summary.totalRows}</span>
                </p>
                <p className="text-sm text-ink-faint">PCs matched to a pin</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">
                  {summary.matchedRooms}
                  <span className="text-base font-medium text-ink-faint"> / {summary.distinctRooms}</span>
                </p>
                <p className="text-sm text-ink-faint">Room numbers matched</p>
              </div>
              <div>
                <p
                  className={`text-2xl font-bold ${
                    summary.unplaced.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-ink"
                  }`}
                >
                  {summary.unplaced.length}
                </p>
                <p className="text-sm text-ink-faint">Room numbers not on a plan</p>
              </div>
            </div>

            {summary.unplaced.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-ink-muted">
                  These room numbers hold PCs but aren&apos;t placed on any floor plan yet. Add
                  them under{" "}
                  <Link href="/admin/floorplans" className="text-brand-600 hover:underline">
                    Floor plans
                  </Link>
                  .
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {summary.unplaced.slice(0, 40).map((r) => (
                    <Badge key={r.key} tone="amber">
                      {r.label} · {r.count}
                    </Badge>
                  ))}
                  {summary.unplaced.length > 40 && (
                    <Badge tone="gray">+{summary.unplaced.length - 40} more</Badge>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

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
