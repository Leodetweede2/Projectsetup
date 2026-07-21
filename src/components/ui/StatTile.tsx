import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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

export function StatTile({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={cn("rounded-xl border p-4", toneClasses[tone])}>
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold tabular-nums", valueClasses[tone])}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}
