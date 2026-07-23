"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { IconCopy, IconCheck } from "@/components/icons";
import { useToast } from "@/components/ui/Toast";

/**
 * Copies `value` to the clipboard on click. Shows a brief check-mark and a
 * toast — handy for servicedesk agents pasting a PC name into a ticket.
 */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  /** What was copied, for the toast (e.g. "PC name"). Defaults to "Value". */
  label?: string;
  className?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast(`${label ?? "Value"} copied`, "success");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast("Could not copy to clipboard", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label ?? value}`}
      aria-label={`Copy ${label ?? value}`}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      {copied ? <IconCheck width={14} height={14} /> : <IconCopy width={14} height={14} />}
    </button>
  );
}
