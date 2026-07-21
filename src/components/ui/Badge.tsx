import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "gray" | "green" | "red" | "blue";

const tones: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  green: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  red: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  blue: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
