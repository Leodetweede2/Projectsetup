"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import type { BrowseRoom } from "@/lib/maps/browse";

interface PlanOption {
  id: string;
  name: string;
  building: string | null;
  floor: string | null;
}

export interface SearchResult {
  roomId: string;
  number: string;
  planLabel: string;
  matchedBy: "room" | "asset";
}

interface Props {
  planId: string;
  planName: string;
  plans: PlanOption[];
  rooms: BrowseRoom[];
  assetColumns: string[];
  assetRoomColumn: string | null;
  query: string;
  searchResults: SearchResult[];
  initialRoomId: string | null;
}

const pcCount = (r: BrowseRoom) => r.assets.length;

const LOCATION_FALLBACK = "Other";

/** The location a plan belongs to (the building field, grouped). */
function planLocation(p: PlanOption): string {
  return p.building?.trim() || LOCATION_FALLBACK;
}

/** Label for a floor button within a location. */
function floorLabel(p: PlanOption): string {
  return p.floor?.trim() ? p.floor.trim() : p.name;
}

export function PlanBrowser({
  planId,
  planName,
  plans,
  rooms,
  assetColumns,
  assetRoomColumn,
  query,
  searchResults,
  initialRoomId,
}: Props) {
  const router = useRouter();
  const [onlyPcs, setOnlyPcs] = useState(true);
  const [attr, setAttr] = useState(""); // asset column to filter PCs on (e.g. Type)
  const [attrVal, setAttrVal] = useState(""); // value the chosen attribute must equal
  const [pinFilter, setPinFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialRoomId);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const pinsRef = useRef<HTMLDivElement | null>(null);

  // Keep the pins a constant on-screen size by counter-scaling them against the
  // current zoom (so the dots get smaller relative to the plan as you zoom in).
  // Updated via a CSS variable on the pins layer — no React re-render per frame.
  function setMapScale(scale: number) {
    pinsRef.current?.style.setProperty("--map-scale", String(scale));
  }

  // When arriving from a search, select and zoom to the target room (used when
  // only the ?room changes without the plan image reloading).
  useEffect(() => {
    if (!initialRoomId) return;
    setSelectedId(initialRoomId);
    const el = document.getElementById(`pin-${initialRoomId}`);
    if (el && transformRef.current) {
      const t = setTimeout(() => transformRef.current?.zoomToElement(el, 3, 400), 60);
      return () => clearTimeout(t);
    }
  }, [initialRoomId]);

  // O(1) room lookup by id (instead of scanning `rooms` on every render).
  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const selected = selectedId ? roomById.get(selectedId) ?? null : null;
  const imageUrl = `/api/floorplans/${planId}/image`;

  // Inventory summary for the current plan (how many PCs / rooms are here).
  const planTotals = useMemo(() => {
    let pcs = 0;
    let roomsWithPcs = 0;
    for (const r of rooms) {
      const c = r.assets.length;
      pcs += c;
      if (c > 0) roomsWithPcs += 1;
    }
    return { pcs, roomsWithPcs };
  }, [rooms]);

  // Absolute origin for building a shareable room link (client-only).
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  // Escape clears the selected room.
  useEffect(() => {
    if (!selectedId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  /** Re-centre and zoom the plan onto the currently selected pin. */
  function centerOnSelected() {
    if (!selectedId) return;
    const el = document.getElementById(`pin-${selectedId}`);
    if (el && transformRef.current) transformRef.current.zoomToElement(el, 3, 400);
  }

  const assetCols = useMemo(
    () => assetColumns.filter((c) => c !== assetRoomColumn),
    [assetColumns, assetRoomColumn],
  );

  // A column that looks like a PC name/hostname, used as each PC card's title.
  const nameCol = useMemo(
    () => assetCols.find((c) => /pc.?naam|hostname|alias|asset|naam|name/i.test(c)) ?? null,
    [assetCols],
  );

  // Distinct values of the chosen attribute across this plan (for the value box).
  const attrValues = useMemo(() => {
    if (!attr) return [];
    const s = new Set<string>();
    for (const r of rooms) {
      for (const row of r.assets) {
        const v = (row[attr] ?? "").trim();
        if (v) s.add(v);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [rooms, attr]);

  // Searchable text per room: room fields + every asset (PC) value, so the free
  // text box can match a PC name, OS, type, user, etc.
  const roomText = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rooms) {
      const parts: (string | null)[] = [r.number, r.name, r.department];
      for (const row of r.assets) for (const c of assetCols) parts.push(row[c] ?? null);
      m.set(r.id, parts.filter(Boolean).join(" ").toLowerCase());
    }
    return m;
  }, [rooms, assetCols]);

  // Rooms visible after applying the filters (others are dimmed on the plan).
  const shownRooms = useMemo(() => {
    const q = pinFilter.trim().toLowerCase();
    return rooms.filter((r) => {
      if (onlyPcs && pcCount(r) === 0) return false;
      if (attr && attrVal && !r.assets.some((row) => (row[attr] ?? "").trim() === attrVal)) {
        return false;
      }
      if (q && !(roomText.get(r.id) ?? "").includes(q)) return false;
      return true;
    });
  }, [rooms, onlyPcs, attr, attrVal, pinFilter, roomText]);
  const shownIds = useMemo(() => new Set(shownRooms.map((r) => r.id)), [shownRooms]);

  // Only render pins that pass the filter (plus the selected one). Fewer DOM
  // nodes inside the transformed layer = smoother pan/zoom on large plans.
  const visiblePins = useMemo(
    () => rooms.filter((r) => shownIds.has(r.id) || r.id === selectedId),
    [rooms, shownIds, selectedId],
  );

  // Filters that also narrow which PCs are shown inside a selected room.
  const pcFilterActive = attr !== "" || pinFilter.trim() !== "";
  const filtersActive = !onlyPcs || pcFilterActive;
  function clearFilters() {
    setOnlyPcs(true);
    setAttr("");
    setAttrVal("");
    setPinFilter("");
  }

  // The PCs to show for the selected room. When a PC filter is active, show only
  // the PCs in the room that match it (falling back to all if the room matched
  // by something other than a PC, e.g. its room number).
  const selectedPcs = useMemo(() => {
    const empty = { assets: [], filtered: false };
    if (!selected) return empty as { assets: BrowseRoom["assets"]; filtered: boolean };
    if (!pcFilterActive) return { assets: selected.assets, filtered: false };
    const q = pinFilter.trim().toLowerCase();
    const assets = selected.assets.filter((row) => {
      if (attr && attrVal && (row[attr] ?? "").trim() !== attrVal) return false;
      if (q && !assetCols.map((c) => row[c] ?? "").join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
    if (assets.length === 0) {
      return { assets: selected.assets, filtered: false };
    }
    return { assets, filtered: true };
  }, [selected, pcFilterActive, attr, attrVal, pinFilter, assetCols]);

  // Bring the details panel into view when a room is selected by clicking a pin.
  useEffect(() => {
    if (selectedId) detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  // Fit the plan to the viewport once the image has its real dimensions — and
  // jump to the deep-linked room if there is one. This fixes the plan appearing
  // off-centre on first load (before the image had loaded).
  function handleImageLoad() {
    const t = transformRef.current;
    if (!t) return;
    if (initialRoomId) {
      const el = document.getElementById(`pin-${initialRoomId}`);
      if (el) {
        t.zoomToElement(el, 3, 400);
        return;
      }
    }
    t.centerView(1, 0);
  }

  // Group the plans by location (building) → floors, for the navigation menu.
  const locations = useMemo(() => {
    const map = new Map<string, PlanOption[]>();
    for (const p of plans) {
      const loc = planLocation(p);
      const list = map.get(loc) ?? [];
      list.push(p);
      map.set(loc, list);
    }
    return [...map.entries()].map(([name, items]) => ({ name, items }));
  }, [plans]);

  const currentPlan = plans.find((p) => p.id === planId) ?? null;
  const currentLocation = currentPlan ? planLocation(currentPlan) : locations[0]?.name;
  const floorsHere = locations.find((l) => l.name === currentLocation)?.items ?? [];

  function goToPlan(id: string) {
    router.push(`/map?plan=${id}`);
  }
  function goToLocation(name: string) {
    const first = locations.find((l) => l.name === name)?.items[0];
    if (first) goToPlan(first.id);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Controls: navigation (location/floor) + filters, in one toolbar. */}
        <div className="divide-y divide-line rounded-lg border border-line bg-surface">
          {/* Cross-plan search. */}
          <div className="p-3">
            <form method="get" action="/map" className="flex items-center gap-2">
              <input
                name="q"
                defaultValue={query}
                placeholder="Search a room number or PC across all plans…"
                className="h-10 w-full max-w-md rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <Button type="submit" size="sm">
                Search
              </Button>
            </form>
          </div>

          {/* Location → floor navigation. */}
          <div className="space-y-2 p-3">
            {locations.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-16 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Location
                </span>
                {locations.map((loc) => {
                  const active = loc.name === currentLocation;
                  return (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => goToLocation(loc.name)}
                      aria-pressed={active}
                      className={[
                        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-brand-600 text-white"
                          : "bg-surface-2 text-ink-muted hover:bg-surface hover:text-ink",
                      ].join(" ")}
                    >
                      {loc.name}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-16 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Floor
              </span>
              {floorsHere.map((p) => {
                const active = p.id === planId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => goToPlan(p.id)}
                    aria-pressed={active}
                    className={[
                      "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                        : "border-line text-ink-muted hover:bg-surface-2 hover:text-ink",
                    ].join(" ")}
                  >
                    {floorLabel(p)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters for the current plan. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
            <span className="w-16 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Filters
            </span>
            <input
              value={pinFilter}
              onChange={(e) => setPinFilter(e.target.value)}
              placeholder="Filter rooms & PCs on this plan…"
              className="h-9 w-56 rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {assetCols.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={attr}
                  onChange={(e) => {
                    setAttr(e.target.value);
                    setAttrVal("");
                  }}
                  className="h-9 max-w-48 rounded-md border border-line bg-surface px-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  title="Filter rooms by a PC property"
                >
                  <option value="">Filter by PC property…</option>
                  {assetCols.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {attr && (
                  <select
                    value={attrVal}
                    onChange={(e) => setAttrVal(e.target.value)}
                    className="h-9 max-w-48 rounded-md border border-line bg-surface px-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  >
                    <option value="">Any value</option>
                    {attrValues.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={onlyPcs}
                onChange={(e) => setOnlyPcs(e.target.checked)}
                className="h-4 w-4"
              />
              Only rooms with PCs
            </label>
            <span className="text-sm text-ink-faint">
              {shownRooms.length} of {rooms.length} rooms
            </span>
            {filtersActive && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
            <span className="ml-auto text-sm text-ink-faint">
              <span className="font-semibold text-ink">{planTotals.pcs}</span> PCs in{" "}
              <span className="font-semibold text-ink">{planTotals.roomsWithPcs}</span> rooms on this
              plan
            </span>
          </div>
        </div>

        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={1}
          maxScale={12}
          limitToBounds
          centerZoomedOut={false}
          doubleClick={{ disabled: true }}
          // Gentle wheel zoom so one scroll notch doesn't jump far in.
          wheel={{ step: 0.03 }}
          disablePadding
          // Stop the pan from "snapping back" after a drag: disable the
          // momentum fling that carries (and re-aligns) the content.
          panning={{ velocityDisabled: true }}
          velocityAnimation={{ disabled: true }}
          onTransform={(_ref, state) => setMapScale(state.scale)}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <div>
              <div className="mb-2 flex gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => zoomIn()}>
                  Zoom in
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => zoomOut()}>
                  Zoom out
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => resetTransform()}>
                  Reset
                </Button>
              </div>
              <TransformComponent
                wrapperStyle={{
                  width: "100%",
                  height: "72vh",
                  background: "rgb(var(--surface-2))",
                  borderRadius: "0.5rem",
                  border: "1px solid rgb(var(--line))",
                  cursor: "grab",
                }}
                contentClass="!w-full"
              >
                <div className="relative w-full" ref={pinsRef}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={planName}
                    className="block w-full"
                    draggable={false}
                    decoding="async"
                    onLoad={handleImageLoad}
                  />
                  {visiblePins.map((room) => {
                    const hasPcs = pcCount(room) > 0;
                    const isSel = room.id === selectedId;
                    return (
                      <button
                        key={room.id}
                        id={`pin-${room.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(room.id);
                        }}
                        title={`${room.number}${room.name ? ` — ${room.name}` : ""}`}
                        className="absolute"
                        style={{
                          left: `${room.x * 100}%`,
                          top: `${room.y * 100}%`,
                          transform:
                            "translate(-50%, -50%) scale(calc(1 / var(--map-scale, 1)))",
                          transformOrigin: "center center",
                          zIndex: isSel ? 20 : hasPcs ? 10 : 1,
                        }}
                      >
                        {isSel && (
                          <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                            {room.number}
                          </span>
                        )}
                        {isSel && (
                          <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-brand-500/60" />
                        )}
                        <span
                          className={[
                            "relative block rounded-full border-2 border-white",
                            isSel ? "h-4 w-4 ring-2 ring-brand-500" : "h-3 w-3",
                            hasPcs ? "bg-red-600" : "bg-slate-400",
                          ].join(" ")}
                        />
                      </button>
                    );
                  })}
                </div>
              </TransformComponent>
              <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" /> has PCs
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" /> no PCs
                </span>
                <span>· click a pin for details, scroll to zoom, drag to pan, Esc to close</span>
              </p>
              {shownRooms.length === 0 && filtersActive && (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                  No rooms on this plan match these filters.
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </p>
              )}
            </div>
          )}
        </TransformWrapper>
      </div>

      {query && searchResults.length > 1 && (
        <div className="rounded-lg border border-line bg-surface p-3 text-sm">
          <p className="mb-2 font-medium text-ink-muted">{searchResults.length} matches</p>
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.slice(0, 30).map((r) => (
              <li key={r.roomId}>
                <Link href={`/map?room=${r.roomId}`} className="text-brand-600 hover:underline">
                  {r.number}
                </Link>
                <span className="text-ink-faint">
                  {" "}
                  — {r.planLabel}
                  {r.matchedBy === "asset" ? " · in asset list" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Selected room: full-width, readable PC details. */}
      <div ref={detailsRef}>
        {selected ? (
          <div className="rounded-lg border border-line bg-surface p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-ink">{selected.number}</h3>
                {(selected.name || selected.department) && (
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {[selected.name, selected.department].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {pcCount(selected) > 0 ? (
                  <Badge tone="red">
                    {selectedPcs.filtered
                      ? `${selectedPcs.assets.length} of ${pcCount(selected)} PC(s)`
                      : `${pcCount(selected)} PC(s)`}
                  </Badge>
                ) : (
                  <Badge tone="gray">no PCs</Badge>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={centerOnSelected}
                  title="Zoom the plan to this room"
                >
                  Center on map
                </Button>
                <CopyButton value={`${origin}/map?room=${selected.id}`} label="Room link" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedId(null)}
                >
                  Close
                </Button>
              </div>
            </div>

            {selectedPcs.filtered && (
              <p className="mt-2 text-xs text-ink-faint">
                Showing only the PCs in this room that match the active filter.
              </p>
            )}

            {selected.assets.length === 0 && (
              <p className="mt-3 text-sm text-ink-faint">No PCs recorded for this room.</p>
            )}

            {selectedPcs.assets.length > 0 && (
              <div className="mt-3 space-y-3">
                {selectedPcs.assets.map((row, i) => {
                  const fields = assetCols.filter((c) => (row[c] ?? "").trim());
                  const title = (nameCol && row[nameCol]?.trim()) || `PC ${i + 1}`;
                  return (
                    <div key={i} className="rounded-lg border border-line bg-surface-2/50 p-3 md:p-4">
                      <div className="mb-2 flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-ink">{title}</p>
                        <CopyButton value={title} label="PC name" />
                      </div>
                      <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {fields.map((c) => (
                          <div key={c} className="min-w-0">
                            <dt className="truncate text-xs uppercase tracking-wide text-ink-faint" title={c}>
                              {c}
                            </dt>
                            <dd className="break-words text-sm font-medium text-ink">{row[c]}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line p-4 text-sm text-ink-faint">
            Click a pin on the plan to see the room and the PCs in it — details appear here. Use the
            search to jump to a specific room or PC, or the filters to narrow the pins.
          </div>
        )}
      </div>
    </div>
  );
}
