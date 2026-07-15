import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAnyPermission } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { setUserActiveAction } from "@/lib/admin/actions";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CreateUserForm } from "./CreateUserForm";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAnyPermission([PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE]);
  const me = await getCurrentUser();
  const canWrite = hasPermission(me, PERMISSIONS.USERS_WRITE);

  const { q } = await searchParams;
  const query = q?.trim();

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        emailVerified: true,
        roles: { select: { name: true } },
      },
      take: 100,
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Users</h1>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Add a user</CardTitle>
          </CardHeader>
          <CardBody>
            <CreateUserForm roles={roles} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between gap-4">
          <CardTitle>All users</CardTitle>
          <form className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search name or email…"
              className="h-9 w-56 rounded-md border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Roles</TH>
                <TH>Status</TH>
                {canWrite && <TH className="text-right">Actions</TH>}
              </TR>
            </THead>
            <TBody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium text-slate-900">{u.name}</TD>
                  <TD>
                    {u.email}
                    {!u.emailVerified && (
                      <span className="ml-2 text-xs text-amber-600">(unverified)</span>
                    )}
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length ? (
                        u.roles.map((r) => (
                          <Badge key={r.name} tone="blue">
                            {r.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </TD>
                  <TD>
                    {u.isActive ? (
                      <Badge tone="green">Active</Badge>
                    ) : (
                      <Badge tone="red">Inactive</Badge>
                    )}
                  </TD>
                  {canWrite && (
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/users/${u.id}`}>
                          <Button variant="secondary" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <form action={setUserActiveAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input
                            type="hidden"
                            name="active"
                            value={(!u.isActive).toString()}
                          />
                          <Button
                            type="submit"
                            variant={u.isActive ? "danger" : "primary"}
                            size="sm"
                            disabled={u.id === me?.id}
                            title={
                              u.id === me?.id ? "You cannot change your own status" : undefined
                            }
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
              {users.length === 0 && (
                <TR>
                  <TD colSpan={canWrite ? 5 : 4} className="py-8 text-center text-slate-400">
                    No users found.
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
