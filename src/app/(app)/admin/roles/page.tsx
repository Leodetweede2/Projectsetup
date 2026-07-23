import { prisma } from "@/lib/db";
import { requireAnyPermission, getCurrentUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS, PERMISSION_METADATA } from "@/lib/rbac/permissions";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconRoles } from "@/components/icons";
import { RolePermissionsForm } from "./RolePermissionsForm";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  await requireAnyPermission([PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_WRITE]);
  const me = await getCurrentUser();
  const canWrite = hasPermission(me, PERMISSIONS.ROLES_WRITE);

  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });

  const permissionItems = Object.entries(PERMISSION_METADATA).map(([key, meta]) => ({
    key,
    ...meta,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & permissions"
        icon={<IconRoles />}
        description={
          canWrite
            ? "Toggle the permissions granted by each role."
            : "You have read-only access to roles."
        }
      />

      {roles.map((role) => (
        <Card key={role.id} data-testid={`role-card-${role.name}`}>
          <CardHeader className="flex items-center gap-3">
            <CardTitle>{role.name}</CardTitle>
            {role.isSystem && <Badge tone="gray">system</Badge>}
            {role.description && (
              <span className="text-sm text-ink-faint">— {role.description}</span>
            )}
          </CardHeader>
          <CardBody>
            <RolePermissionsForm
              role={{ id: role.id, name: role.name, isSystem: role.isSystem }}
              permissions={permissionItems}
              granted={role.permissions}
              canWrite={canWrite}
            />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
