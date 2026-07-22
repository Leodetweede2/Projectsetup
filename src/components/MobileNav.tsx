"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AppNav, type NavGroup } from "./AppNav";

/**
 * Mobile navigation: a hamburger button (shown below `md`) that opens a
 * slide-over drawer with the same nav as the desktop sidebar. Closes on
 * navigation, on the backdrop, and on Escape. The drawer is rendered through a
 * portal on document.body so it isn't clipped by the header's backdrop-blur
 * (which would otherwise become the containing block for `position: fixed`).
 */
export function MobileNav({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Close whenever the route changes (i.e. after tapping a link).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape and prevent background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-0 flex h-full w-64 max-w-[82%] flex-col overflow-y-auto border-r border-line bg-surface p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
                  Menu
                </span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <AppNav groups={groups} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
