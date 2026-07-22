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
  matchedBy: "room" | "device";
  deviceName?: string;
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

const pcCount = (r: BrowseRoom) => r.devices.length + r.assets.length;

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
  const [onlyPcs, setOnlyPcs] = useState(false);
  const [dept, setDept] = useState("");
  const [pinFilter, setPinFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialRoomId);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

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

  const selected = rooms.find((r) => r.id === selectedId) ?? null;
  const imageUrl = `/api/floorplans/${planId}/image`;

  const assetCols = useMemo(
    () => assetColumns.filter((c) => c !== assetRoomColumn),
    [assetColumns, assetRoomColumn],
  );

  // Detect the department column (Afdeling / Department) for the filter.
  const deptColumn = useMemo(
    () => assetColumns.find((c) => /afdeling|department|dept|\bafd\b/i.test(c)) ?? null,
    [assetColumns],
  );
  const roomDepts = useMemo(() => {
    const map = new Map<string, string[]>();
    if (deptColumn) {
      for (const r of rooms) {
        const list = r.assets.map((a) => (a[deptColumn] ?? "").trim()).filter(Boolean);
        if (list.length) map.set(r.id, list);
      }
    }
    return map;
  }, [rooms, deptColumn]);
  const departmentOptions = useMemo(() => {
    const s = new Set<string>();
    for (const list of roomDepts.values()) for (const d of list) s.add(d);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [roomDepts]);

  // Rooms visible after applying the filters (others are dimmed on the plan).
  const shownRooms = useMemo(() => {
    const q = pinFilter.trim().toLowerCase();
    return rooms.filter((r) => {
      if (onlyPcs && pcCount(r) === 0) return false;
      if (dept && !(roomDepts.get(r.id) ?? []).includes(dept)) return false;
      if (q) {
        const hay = [r.number, r.name, r.department, ...(roomDepts.get(r.id) ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rooms, onlyPcs, dept, pinFilter, roomDepts]);
  const shownIds = useMemo(() => new Set(shownRooms.map((r) => r.id)), [shownRooms]);

  const filtersActive = onlyPcs || dept !== "" || pinFilter.trim() !== "";
  function clearFilters() {
    setOnlyPcs(false);
    setDept("");
    setPinFilter("");
  }

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
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
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
              placeholder="Filter rooms on this plan…"
              className="h-9 w-56 rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {deptColumn && departmentOptions.length > 0 && (
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="h-9 rounded-md border border-line bg-surface px-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">All departments</option>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
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
                  height: "78vh",
                  background: "rgb(var(--surface-2))",
                  borderRadius: "0.5rem",
                  border: "1px solid rgb(var(--line))",
                  cursor: "grab",
                }}
                contentClass="!w-full"
              >
                <div className="relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={planName}
                    className="block w-full"
                    onLoad={handleImageLoad}
                  />
                  {rooms.map((room) => {
                    const shown = shownIds.has(room.id);
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
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${room.x * 100}%`,
                          top: `${room.y * 100}%`,
                          opacity: shown ? 1 : 0.15,
                          pointerEvents: shown ? "auto" : "none",
                          zIndex: isSel ? 20 : hasPcs ? 10 : 1,
                        }}
                      >
                        {isSel && (
                          <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                            {room.number}
                          </span>
                        )}
                        <span
                          className={[
                            "block rounded-full border-2 border-white shadow",
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
                <span>· click a pin for details, scroll to zoom, drag to pan</span>
              </p>
            </div>
          )}
        </TransformWrapper>
      </div>

      <div className="space-y-4">
        {query && searchResults.length > 1 && (
          <div className="rounded-lg border border-line bg-surface p-3 text-sm">
            <p className="mb-2 font-medium text-ink-muted">{searchResults.length} matches</p>
            <ul className="space-y-1">
              {searchResults.slice(0, 25).map((r) => (
                <li key={r.roomId}>
                  <Link href={`/map?room=${r.roomId}`} className="text-brand-600 hover:underline">
                    {r.number}
                  </Link>
                  <span className="text-ink-faint">
                    {" "}
                    — {r.planLabel}
                    {r.matchedBy === "device" && r.deviceName ? ` · PC ${r.deviceName}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selected ? (
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-ink">{selected.number}</h3>
              {pcCount(selected) > 0 ? (
                <Badge tone="red">{pcCount(selected)} PC(s)</Badge>
              ) : (
                <Badge tone="gray">no PCs</Badge>
              )}
            </div>
            {(selected.name || selected.department) && (
              <p className="mt-1 text-sm text-ink-muted">
                {[selected.name, selected.department].filter(Boolean).join(" · ")}
              </p>
            )}

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                PCs in this room
              </p>
              {selected.assets.length === 0 && selected.devices.length === 0 && (
                <p className="mt-1 text-sm text-ink-faint">No PCs recorded for this room.</p>
              )}

              {selected.devices.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-sm text-ink-muted">
                  {selected.devices.map((d) => (
                    <li key={d.id}>
                      {d.name}
                      {d.assetTag && <span className="text-ink-faint"> · {d.assetTag}</span>}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2 max-h-96 space-y-2 overflow-auto">
                {selected.assets.map((row, i) => (
                  <div key={i} className="rounded border border-line p-2 text-sm">
                    {assetCols
                      .filter((c) => (row[c] ?? "").trim())
                      .map((c) => (
                        <div key={c} className="flex justify-between gap-3">
                          <span className="text-ink-faint">{c}</span>
                          <span className="text-right font-medium text-ink-muted">{row[c]}</span>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line p-4 text-sm text-ink-faint">
            Click a pin on the plan to see the room and the PCs in it. Search above to jump to a
            specific room or PC, or switch to another floor plan.
          </div>
        )}
      </div>
    </div>
  );
}
