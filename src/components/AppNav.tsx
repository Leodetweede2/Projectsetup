"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export function AppNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-5">
      {groups
        .filter((g) => g.items.length > 0)
        .map((group, i) => (
          <div key={group.label ?? i} className="space-y-1">
            {group.label && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
    </nav>
  );
}
