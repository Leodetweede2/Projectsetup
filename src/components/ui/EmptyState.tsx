import type { ReactNode } from "react";

/** A friendly empty/placeholder state: icon + title + description + optional CTA. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-faint">
          {icon}
        </span>
      )}
      <div className="max-w-sm">
        <p className="font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 text-sm text-ink-faint">{description}</p>}
      </div>
      {action}
    </div>
  );
}
