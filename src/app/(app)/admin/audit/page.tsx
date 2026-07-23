import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconAudit } from "@/components/icons";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission(PERMISSIONS.AUDIT_READ);
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        icon={<IconAudit />}
        description={`${total} recorded events.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Time</TH>
                <TH>Actor</TH>
                <TH>Action</TH>
                <TH>Target</TH>
                <TH>IP</TH>
              </TR>
            </THead>
            <TBody>
              {logs.map((log) => (
                <TR key={log.id}>
                  <TD className="whitespace-nowrap text-ink-faint">
                    {log.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </TD>
                  <TD>
                    {log.actor ? (
                      <span title={log.actor.email}>{log.actor.name}</span>
                    ) : (
                      <span className="text-ink-faint">system / anonymous</span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone="gray">{log.action}</Badge>
                  </TD>
                  <TD className="text-ink-faint">
                    {log.targetType ? `${log.targetType}:${log.targetId ?? "?"}` : "—"}
                  </TD>
                  <TD className="text-ink-faint">{log.ip ?? "—"}</TD>
                </TR>
              ))}
              {logs.length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-8 text-center text-ink-faint">
                    No events recorded yet.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between text-sm text-ink-faint">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/admin/audit?page=${page - 1}`}
              className="rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-ink-muted hover:bg-surface-2"
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/admin/audit?page=${page + 1}`}
              className="rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-ink-muted hover:bg-surface-2"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
