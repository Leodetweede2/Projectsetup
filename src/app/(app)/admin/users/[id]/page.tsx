import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { EditUserForm } from "./EditUserForm";

export const dynamic = "force-dynamic";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.USERS_WRITE);
  const { id } = await params;

  const [user, roles] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, roles: { select: { id: true } } },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!user) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-brand-600 hover:underline">
          ← Back to users
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Edit user</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{user.email}</CardTitle>
        </CardHeader>
        <CardBody>
          <EditUserForm
            user={{ id: user.id, name: user.name, email: user.email }}
            roles={roles}
            assignedRoleIds={user.roles.map((r) => r.id)}
          />
        </CardBody>
      </Card>
    </div>
  );
}
