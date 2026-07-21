"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { BrowseRoom } from "@/lib/maps/browse";

interface PlanOption {
  id: string;
  name: string;
  building: string | null;
  floor: string | null;
}

interface Props {
  planId: string;
  planName: string;
  plans: PlanOption[];
  rooms: BrowseRoom[];
}

const pcCount = (r: BrowseRoom) => r.devices.length + r.assetCount;

function planOptionLabel(p: PlanOption) {
  const loc = [p.building && `Bldg ${p.building}`, p.floor && `Fl ${p.floor}`].filter(Boolean).join(" · ");
  return loc ? `${p.name} — ${loc}` : p.name;
}

export function PlanBrowser({ planId, planName, plans, rooms }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [onlyPcs, setOnlyPcs] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const set = new Set<string>();
    for (const r of rooms) {
      const hit =
        !q ||
        r.number.toLowerCase().includes(q) ||
        (r.name?.toLowerCase().includes(q) ?? false) ||
        (r.department?.toLowerCase().includes(q) ?? false);
      if (hit && (!onlyPcs || pcCount(r) > 0)) set.add(r.id);
    }
    return set;
  }, [rooms, q, onlyPcs]);

  const selected = rooms.find((r) => r.id === selectedId) ?? null;
  const imageUrl = `/api/floorplans/${planId}/image`;
  const filterActive = q.length > 0 || onlyPcs;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={planId}
            onChange={(e) => router.push(`/map?plan=${e.target.value}`)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {planOptionLabel(p)}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter rooms / PCs…"
            className="h-10 w-56 rounded-md border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={onlyPcs}
              onChange={(e) => setOnlyPcs(e.target.checked)}
              className="h-4 w-4"
            />
            Only rooms with PCs
          </label>
          <span className="text-sm text-slate-500">{matches.size} shown</span>
        </div>

        <TransformWrapper initialScale={1} minScale={0.5} maxScale={10} centerOnInit doubleClick={{ disabled: true }}>
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
                  height: "76vh",
                  background: "#f1f5f9",
                  borderRadius: "0.5rem",
                  border: "1px solid #e2e8f0",
                }}
                contentClass="!w-full"
              >
                <div className="relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={planName} className="block w-full" />
                  {rooms.map((room) => {
                    const shown = matches.has(room.id);
                    const hasPcs = pcCount(room) > 0;
                    const isSel = room.id === selectedId;
                    return (
                      <button
                        key={room.id}
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
                          opacity: filterActive && !shown ? 0.15 : 1,
                          pointerEvents: filterActive && !shown ? "none" : "auto",
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
              <p className="mt-2 flex items-center gap-3 text-xs text-slate-500">
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
        {selected ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900">{selected.number}</h3>
              {pcCount(selected) > 0 ? (
                <Badge tone="red">{pcCount(selected)} PC(s)</Badge>
              ) : (
                <Badge tone="gray">no PCs</Badge>
              )}
            </div>
            {(selected.name || selected.department) && (
              <p className="mt-1 text-sm text-slate-600">
                {[selected.name, selected.department].filter(Boolean).join(" · ")}
              </p>
            )}
            {selected.devices.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">PCs</p>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                  {selected.devices.map((d) => (
                    <li key={d.id}>
                      {d.name}
                      {d.assetTag && <span className="text-slate-400"> · {d.assetTag}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selected.assetCount > 0 && (
              <p className="mt-3 text-sm text-slate-600">
                {selected.assetCount} row(s) in the asset list.
              </p>
            )}
            <Link
              href={`/find/${selected.id}`}
              className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
            >
              Open full details →
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Click a pin on the plan to see the room and its PCs. Use the filter to find a
            specific room, or switch to another floor plan above.
          </div>
        )}
      </div>
    </div>
  );
}
