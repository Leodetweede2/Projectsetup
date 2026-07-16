import { requireUser } from "@/lib/auth/guards";
import { hasAnyPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { AppNav, type NavItem } from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const nav: NavItem[] = [{ href: "/dashboard", label: "Dashboard" }];
  if (hasAnyPermission(user, [PERMISSIONS.MAPS_READ])) {
    nav.push({ href: "/find", label: "Find PC" });
  }
  if (hasAnyPermission(user, [PERMISSIONS.MAPS_WRITE])) {
    nav.push({ href: "/admin/floorplans", label: "Floor plans" });
  }
  if (hasAnyPermission(user, [PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE])) {
    nav.push({ href: "/admin/users", label: "Users" });
  }
  if (hasAnyPermission(user, [PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_WRITE])) {
    nav.push({ href: "/admin/roles", label: "Roles" });
  }
  if (hasAnyPermission(user, [PERMISSIONS.AUDIT_READ])) {
    nav.push({ href: "/admin/audit", label: "Audit log" });
  }
  nav.push({ href: "/profile", label: "Profile" });
  nav.push({ href: "/settings", label: "Settings" });

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
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

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="w-52 shrink-0">
          <AppNav items={nav} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
