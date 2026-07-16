import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { searchAssetRecords } from "@/lib/assets/queries";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

export const dynamic = "force-dynamic";

export default async function AssetListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission(PERMISSIONS.MAPS_READ);
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const { import: imp, columns, rows, total } = await searchAssetRecords(query);

  if (!imp) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Asset list</h1>
        <Card>
          <CardBody className="text-slate-500">
            No asset list has been imported yet. An administrator can import one under
            Admin → Asset list.
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Asset list</h1>
        <p className="mt-1 text-sm text-slate-500">
          From <span className="font-medium">{imp.filename}</span> · {imp.rowCount} rows.
          Search any column; rows link to their location on the floor plan.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search room, PC, user, …"
          className="h-10 w-full max-w-md rounded-md border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <Button type="submit">Search</Button>
      </form>

      {query && (
        <p className="text-sm text-slate-500">
          {total} result{total === 1 ? "" : "s"} for “{query}”
          {total > rows.length ? ` (showing first ${rows.length})` : ""}.
        </p>
      )}

      <Card>
        <CardBody className="p-0">
          <Table>
            <THead>
              <TR>
                {columns.map((c) => (
                  <TH key={c}>{c}</TH>
                ))}
                <TH className="text-right">Location</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  {columns.map((c) => (
                    <TD key={c} className={c === imp.roomNumberColumn ? "font-medium text-slate-900" : ""}>
                      {r.data[c] ?? ""}
                    </TD>
                  ))}
                  <TD className="text-right">
                    {r.roomId ? (
                      <Link
                        href={`/find/${r.roomId}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        Show on map →
                      </Link>
                    ) : (
                      <span className="text-slate-400">not on a map</span>
                    )}
                  </TD>
                </TR>
              ))}
              {rows.length === 0 && (
                <TR>
                  <TD colSpan={columns.length + 1} className="py-8 text-center text-slate-400">
                    No matching rows.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
