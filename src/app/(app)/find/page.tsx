import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { searchLocations, planLabel } from "@/lib/maps/search";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission(PERMISSIONS.MAPS_READ);
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchLocations(query) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Find a PC</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search by room number, room name, department, or PC name / asset tag.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="e.g. H1.001 or AMP-PC-0421"
          className="h-11 flex-1 rounded-md border border-slate-300 px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <Button type="submit" className="h-11">
          Search
        </Button>
      </form>

      {query && (
        <p className="text-sm text-slate-500">
          {results.length} result{results.length === 1 ? "" : "s"} for “{query}”.
        </p>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <Link key={r.room.id} href={`/find/${r.room.id}`} className="block">
            <Card className="transition-colors hover:border-brand-300">
              <CardBody className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-slate-900">
                      {r.room.number}
                    </span>
                    {r.matchedBy === "device" && (
                      <Badge tone="blue">PC: {r.deviceName}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    {[r.room.name, r.room.department].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="text-xs text-slate-400">{planLabel(r.room.floorPlan)}</p>
                </div>
                <span className="text-brand-600">View on map →</span>
              </CardBody>
            </Card>
          </Link>
        ))}
        {query && results.length === 0 && (
          <Card>
            <CardBody className="text-center text-slate-400">
              No rooms or PCs match “{query}”.
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
