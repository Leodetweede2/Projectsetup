import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { IconChevronRight } from "@/components/icons";

type Tone = "brand" | "green" | "amber" | "slate";

const toneClasses: Record<Tone, string> = {
  brand: "border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10",
  green: "border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10",
  amber: "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10",
  slate: "border-line bg-surface",
};

const valueClasses: Record<Tone, string> = {
  brand: "text-brand-700 dark:text-brand-300",
  green: "text-green-700 dark:text-green-300",
  amber: "text-amber-700 dark:text-amber-300",
  slate: "text-ink",
};

const iconClasses: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  green: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  slate: "bg-surface-2 text-ink-muted",
};

export function StatTile({
  label,
  value,
  sub,
  tone = "slate",
  href,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  /** When set, the tile becomes a link (with a hover affordance). */
  href?: string;
  /** Small icon shown in the corner. */
  icon?: ReactNode;
}) {
  const className = cn(
    "group block rounded-xl border p-4 shadow-elevated transition-all",
    toneClasses[tone],
    href && "hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lifted",
  );
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              iconClasses[tone],
            )}
          >
            {icon}
          </span>
        ) : href ? (
          <span aria-hidden className="text-ink-faint transition-transform group-hover:translate-x-0.5">
            <IconChevronRight width={16} height={16} />
          </span>
        ) : null}
      </div>
      <p className={cn("mt-2 text-3xl font-bold tabular-nums", valueClasses[tone])}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
