"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { NavGroup } from "./AppNav";
import { navIcon, IconSearch, IconMap, IconCpu, IconCornerDownLeft } from "./icons";

interface RoomHit {
  roomId: string;
  number: string;
  label: string;
  matchedBy: "room" | "asset";
}

type Item =
  | { kind: "nav"; label: string; href: string; icon: React.ReactNode }
  | { kind: "room"; hit: RoomHit };

/**
 * Global command palette (⌘K / Ctrl-K). Quick-navigate to any page and live-
 * search rooms/PCs (via /api/search, which reuses searchLocations). Rendered in
 * the app shell; opened by the header button or the keyboard shortcut.
 */
export function CommandPalette({ groups }: { groups: NavGroup[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RoomHit[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const navItems = useMemo<Item[]>(
    () =>
      groups.flatMap((g) =>
        g.items.map((it) => ({
          kind: "nav" as const,
          label: it.label,
          href: it.href,
          icon: navIcon(it.href),
        })),
      ),
    [groups],
  );

  // Global keyboard shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset + focus when opening; lock scroll.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Debounced live search.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setHits(Array.isArray(data.results) ? data.results : []);
      } catch {
        /* aborted or failed */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? navItems.filter((i) => i.kind === "nav" && i.label.toLowerCase().includes(q)) : navItems;
  }, [navItems, query]);

  const items = useMemo<Item[]>(
    () => [...filteredNav, ...hits.map((hit) => ({ kind: "room" as const, hit }))],
    [filteredNav, hits],
  );

  useEffect(() => setActive(0), [items.length]);

  const run = useCallback(
    (item: Item) => {
      setOpen(false);
      if (item.kind === "nav") router.push(item.href);
      else router.push(`/map?room=${item.hit.roomId}`);
    },
    [router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      run(items[active]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink-faint hover:border-brand-300 hover:text-ink sm:flex"
        aria-label="Search"
      >
        <IconSearch width={16} height={16} />
        <span>Search…</span>
        <kbd className="ml-1 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">
          ⌘K
        </kbd>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              className="relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-lifted"
            >
              <div className="flex items-center gap-2 border-b border-line px-3">
                <span className="text-ink-faint">
                  <IconSearch />
                </span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search pages, rooms or PCs…"
                  className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                />
              </div>

              <ul className="max-h-80 overflow-y-auto py-2">
                {items.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-ink-faint">No results.</li>
                )}
                {items.map((item, i) => {
                  const selected = i === active;
                  const key = item.kind === "nav" ? `n:${item.href}` : `r:${item.hit.roomId}`;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => run(item)}
                        className={[
                          "flex w-full items-center gap-3 px-4 py-2 text-left text-sm",
                          selected ? "bg-brand-50 text-ink dark:bg-brand-500/15" : "text-ink-muted",
                        ].join(" ")}
                      >
                        <span className="shrink-0 text-ink-faint">
                          {item.kind === "nav" ? item.icon : item.hit.matchedBy === "asset" ? <IconCpu /> : <IconMap />}
                        </span>
                        {item.kind === "nav" ? (
                          <span className="font-medium text-ink">{item.label}</span>
                        ) : (
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-ink">{item.hit.number}</span>
                            <span className="text-ink-faint">
                              {" "}
                              — {item.hit.label}
                              {item.hit.matchedBy === "asset" ? " · in asset list" : ""}
                            </span>
                          </span>
                        )}
                        {selected && (
                          <span className="ml-auto shrink-0 text-ink-faint">
                            <IconCornerDownLeft width={14} height={14} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
