import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "brand" | "green" | "amber" | "slate";

const toneClasses: Record<Tone, string> = {
  brand: "border-brand-200 bg-brand-50",
  green: "border-green-200 bg-green-50",
  amber: "border-amber-200 bg-amber-50",
  slate: "border-slate-200 bg-white",
};

const valueClasses: Record<Tone, string> = {
  brand: "text-brand-700",
  green: "text-green-700",
  amber: "text-amber-700",
  slate: "text-slate-900",
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
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold tabular-nums", valueClasses[tone])}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
