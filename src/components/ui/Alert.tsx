import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, string> = {
  error: "bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  success:
    "bg-green-50 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
  info: "bg-brand-50 text-brand-800 border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/30",
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  if (!children) return null;
  return (
    <div className={cn("rounded-md border px-4 py-3 text-sm", tones[tone])} role="alert">
      {children}
    </div>
  );
}
