import { requireUser } from "@/lib/auth/guards";
import { hasAnyPermission } from "@/lib/rbac/hasPermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { AppNav, type NavGroup, type NavItem } from "@/components/AppNav";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="flex h-14 w-full items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
              A
            </div>
            <span className="font-semibold text-ink">App Template</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline">{user.name}</span>
            <ThemeToggle />
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex w-full gap-8 px-6 py-6 lg:px-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-20">
            <AppNav groups={nav} />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
