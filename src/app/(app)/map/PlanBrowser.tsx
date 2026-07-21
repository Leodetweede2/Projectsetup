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
  const [selectedId, setSelectedId] = useState<string | null>(initialRoomId);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  // When arriving from a search, select and zoom to the target room.
  useEffect(() => {
    if (!initialRoomId) return;
    setSelectedId(initialRoomId);
    const el = document.getElementById(`pin-${initialRoomId}`);
    if (el && transformRef.current) {
      const t = setTimeout(() => transformRef.current?.zoomToElement(el, 3, 500), 200);
      return () => clearTimeout(t);
    }
  }, [initialRoomId]);

  const selected = rooms.find((r) => r.id === selectedId) ?? null;
  const imageUrl = `/api/floorplans/${planId}/image`;

  const shownRooms = useMemo(
    () => (onlyPcs ? rooms.filter((r) => pcCount(r) > 0) : rooms),
    [rooms, onlyPcs],
  );
  const shownIds = useMemo(() => new Set(shownRooms.map((r) => r.id)), [shownRooms]);

  const assetCols = useMemo(
    () => assetColumns.filter((c) => c !== assetRoomColumn),
    [assetColumns, assetRoomColumn],
  );

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
        <div className="flex flex-wrap items-center gap-3">
          <form method="get" action="/map" className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search room or PC (all plans)…"
              className="h-10 w-64 rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={onlyPcs}
              onChange={(e) => setOnlyPcs(e.target.checked)}
              className="h-4 w-4"
            />
            Only rooms with PCs
          </label>
        </div>

        {/* Location → floor navigation. */}
        <div className="space-y-2 rounded-lg border border-line bg-surface p-3">
          {locations.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
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
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
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

        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={1}
          maxScale={12}
          centerOnInit
          limitToBounds
          centerZoomedOut={false}
          doubleClick={{ disabled: true }}
          wheel={{ step: 0.2 }}
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
                  <img src={imageUrl} alt={planName} className="block w-full" />
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
