"use client";

import { useState, useTransition } from "react";
import {
  createRoomAction,
  updateRoomAction,
  moveRoomAction,
  deleteRoomAction,
} from "@/lib/maps/actions";
import type { ActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

interface RoomDTO {
  id: string;
  number: string;
  name: string | null;
  department: string | null;
  x: number;
  y: number;
}
interface UnplacedRoom {
  label: string;
  count: number;
}
interface Props {
  plan: { id: string; name: string };
  rooms: RoomDTO[];
  /** Asset-list room numbers not on any plan yet (to place quickly). */
  unplaced: UnplacedRoom[];
}

export function PinEditor({ plan, rooms, unplaced }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [moveMode, setMoveMode] = useState(false);
  const [prefillNumber, setPrefillNumber] = useState<string | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  const selected = rooms.find((r) => r.id === selectedId) ?? null;
  const imageUrl = `/api/floorplans/${plan.id}/image`;

  function coordsFromEvent(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }

  function onMapClick(e: React.MouseEvent<HTMLDivElement>) {
    const { x, y } = coordsFromEvent(e);
    if (moveMode && selected) {
      const fd = new FormData();
      fd.set("roomId", selected.id);
      fd.set("x", String(x));
      fd.set("y", String(y));
      startTransition(async () => {
        await moveRoomAction(fd);
        setMoveMode(false);
      });
      return;
    }
    setSelectedId(null);
    setState({});
    setPending({ x, y });
  }

  function run(action: (p: ActionState, fd: FormData) => Promise<ActionState>, fd: FormData, onOk?: () => void) {
    startTransition(async () => {
      const result = await action({}, fd);
      setState(result);
      if (result.success) onOk?.();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      {/* Map */}
      <div>
        <p className="mb-2 text-sm text-ink-faint">
          {moveMode
            ? "Click the map to move the selected pin."
            : prefillNumber
              ? `Click the map to place room ${prefillNumber}.`
              : "Click an empty spot to add a room, or click a pin to edit it."}
        </p>
        <div className="overflow-auto rounded-lg border border-line bg-surface-2">
          <div
            className="relative w-full cursor-crosshair select-none"
            onClick={onMapClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={plan.name} className="block w-full" />

            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPending(null);
                  setState({});
                  setMoveMode(false);
                  setSelectedId(room.id);
                }}
                title={`${room.number}${room.name ? ` — ${room.name}` : ""}`}
                className={`absolute -translate-x-1/2 -translate-y-full ${
                  selectedId === room.id ? "z-10" : ""
                }`}
                style={{ left: `${room.x * 100}%`, top: `${room.y * 100}%` }}
              >
                <span
                  className={`flex flex-col items-center ${
                    selectedId === room.id ? "text-brand-700" : "text-red-600"
                  }`}
                >
                  <span className="max-w-[8rem] truncate rounded bg-surface/90 px-1 text-[10px] font-semibold shadow">
                    {room.number}
                  </span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                  </svg>
                </span>
              </button>
            ))}

            {pending && (
              <span
                className="absolute -translate-x-1/2 -translate-y-full text-brand-600"
                style={{ left: `${pending.x * 100}%`, top: `${pending.y * 100}%` }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Panel */}
      <div className="space-y-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.success && <Alert tone="success">{state.success}</Alert>}

        {/* New room */}
        {pending && (
          <div className="rounded-lg border border-line bg-surface p-4">
            <h3 className="mb-3 font-semibold text-ink">New room</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("floorPlanId", plan.id);
                fd.set("x", String(pending.x));
                fd.set("y", String(pending.y));
                run(createRoomAction, fd, () => {
                  setPending(null);
                  setPrefillNumber(null);
                });
              }}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="n-number">Room number</Label>
                <Input
                  key={prefillNumber ?? "new"}
                  id="n-number"
                  name="number"
                  defaultValue={prefillNumber ?? ""}
                  required
                />
                <FieldError>{state.fieldErrors?.number}</FieldError>
              </div>
              <div>
                <Label htmlFor="n-name">Name (optional)</Label>
                <Input id="n-name" name="name" />
              </div>
              <div>
                <Label htmlFor="n-dept">Department (optional)</Label>
                <Input id="n-dept" name="department" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  Add room
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPending(null);
                    setPrefillNumber(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Edit room */}
        {selected && (
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-ink">Edit {selected.number}</h3>
              <Badge tone="blue">selected</Badge>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("roomId", selected.id);
                run(updateRoomAction, fd);
              }}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="e-number">Room number</Label>
                <Input id="e-number" name="number" defaultValue={selected.number} required />
                <FieldError>{state.fieldErrors?.number}</FieldError>
              </div>
              <div>
                <Label htmlFor="e-name">Name</Label>
                <Input id="e-name" name="name" defaultValue={selected.name ?? ""} />
              </div>
              <div>
                <Label htmlFor="e-dept">Department</Label>
                <Input id="e-dept" name="department" defaultValue={selected.department ?? ""} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setMoveMode((m) => !m)}
                >
                  {moveMode ? "Cancel move" : "Move pin"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={isPending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("roomId", selected.id);
                    startTransition(async () => {
                      await deleteRoomAction(fd);
                      setSelectedId(null);
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            </form>

            <p className="mt-4 border-t border-line pt-4 text-xs text-ink-faint">
              PCs are linked automatically from the imported asset list by room
              number — there is nothing to add here by hand.
            </p>
          </div>
        )}

        {!pending && !selected && (
          <div className="rounded-lg border border-dashed border-line p-4 text-sm text-ink-faint">
            Select a pin to edit it, or click an empty spot on the map to add a room.
          </div>
        )}

        {unplaced.length > 0 && (
          <div className="rounded-lg border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold text-ink">Unplaced from the asset list</h3>
            <p className="mt-0.5 text-xs text-ink-faint">
              {unplaced.length} room number{unplaced.length === 1 ? "" : "s"} with PCs aren&apos;t
              on any plan. Click one, then click the map to place it.
            </p>
            <div className="mt-3 flex max-h-56 flex-wrap gap-1.5 overflow-auto">
              {unplaced.map((r) => {
                const active = prefillNumber === r.label;
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => {
                      setSelectedId(null);
                      setPending(null);
                      setMoveMode(false);
                      setState({});
                      setPrefillNumber(active ? null : r.label);
                    }}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                    }`}
                    title={`${r.count} PC${r.count === 1 ? "" : "s"} in ${r.label}`}
                  >
                    {r.label}
                    <span className={active ? "text-white/80" : "text-amber-500/80"}>· {r.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
