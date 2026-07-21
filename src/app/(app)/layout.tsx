import { requireUser } from "@/lib/auth/guards";
import { hasAnyPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { AppNav, type NavGroup, type NavItem } from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const main: NavItem[] = [{ href: "/dashboard", label: "Dashboard" }];
  if (hasAnyPermission(user, [PERMISSIONS.MAPS_READ])) {
    main.push({ href: "/map", label: "Map" });
    main.push({ href: "/list", label: "Asset list" });
  }

  const admin: NavItem[] = [];
  if (hasAnyPermission(user, [PERMISSIONS.MAPS_WRITE])) {
    admin.push({ href: "/admin/floorplans", label: "Floor plans" });
    admin.push({ href: "/admin/assets", label: "Import list" });
  }
  if (hasAnyPermission(user, [PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE])) {
    admin.push({ href: "/admin/users", label: "Users" });
  }
  if (hasAnyPermission(user, [PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_WRITE])) {
    admin.push({ href: "/admin/roles", label: "Roles" });
  }
  if (hasAnyPermission(user, [PERMISSIONS.AUDIT_READ])) {
    admin.push({ href: "/admin/audit", label: "Audit log" });
  }

  const nav: NavGroup[] = [
    { items: main },
    { label: "Admin", items: admin },
    { items: [{ href: "/account", label: "Account" }] },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex h-14 w-full items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
              A
            </div>
            <span className="font-semibold text-slate-900">App Template</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{user.name}</span>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex w-full gap-8 px-6 py-6 lg:px-8">
        <aside className="w-56 shrink-0">
          <AppNav groups={nav} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
