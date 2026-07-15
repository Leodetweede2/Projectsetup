import { requireUser } from "@/lib/auth/guards";
import { effectivePermissions } from "@/lib/rbac/hasPermission";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function DashboardPage() {
  const user = await requireUser();
  const permissions = [...effectivePermissions(user)].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          You are signed in as {user.email}.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your roles</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            {user.roles.length ? (
              user.roles.map((r) => (
                <Badge key={r.name} tone="blue">
                  {r.name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-500">No roles assigned.</span>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your permissions</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            {permissions.length ? (
              permissions.map((p) => (
                <Badge key={p} tone="gray">
                  {p}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-500">No special permissions.</span>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardBody className="prose prose-sm max-w-none text-slate-600">
          <p>
            This is a reusable starter. Replace this dashboard with your app&apos;s home
            screen. Authentication, user accounts, roles/permissions, profile &amp; settings,
            and an audit log are already wired up.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
