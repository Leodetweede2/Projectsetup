"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { navIcon } from "./icons";

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
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                      : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <span className={cn("shrink-0", active ? "text-brand-600 dark:text-brand-300" : "text-ink-faint")}>
                    {navIcon(item.href)}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
    </nav>
  );
}
