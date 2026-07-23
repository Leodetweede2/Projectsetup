import type { ReactNode } from "react";
import Link from "next/link";

/** Consistent page header: title + optional description and right-aligned actions. */
export function PageHeader({
  title,
  description,
  actions,
  icon,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  /** Optional back-link rendered above the title. */
  back?: { href: string; label: string };
}) {
  return (
    <div className="space-y-2">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
        >
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-muted">
              {icon}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
            {description && <p className="mt-1 text-sm text-ink-faint">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
