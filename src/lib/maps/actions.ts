"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import {
  floorPlanUpdateSchema,
  roomCreateSchema,
  roomMoveSchema,
  roomUpdateSchema,
} from "@/lib/validation";
import type { ActionState } from "@/lib/auth/actions";

function fieldErrorsFrom(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

function editorPath(floorPlanId: string) {
  revalidatePath(`/admin/floorplans/${floorPlanId}`);
}

// --- Rooms -----------------------------------------------------------------

export async function createRoomAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission(PERMISSIONS.MAPS_WRITE);
  const parsed = roomCreateSchema.safeParse({
    floorPlanId: formData.get("floorPlanId"),
    number: formData.get("number"),
    name: formData.get("name"),
    department: formData.get("department"),
    x: formData.get("x"),
    y: formData.get("y"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { floorPlanId, number, name, department, x, y } = parsed.data;
  const room = await prisma.room.create({
    data: {
      floorPlanId,
      number,
      name: name || null,
      department: department || null,
      x,
      y,
    },
  });
  await logAudit({
    action: AUDIT_ACTIONS.ROOM_CREATED,
    actorUserId: actor.id,
    targetType: "room",
    targetId: room.id,
    metadata: { floorPlanId, number },
  });
  editorPath(floorPlanId);
  return { success: `Room ${number} added.` };
}

export async function updateRoomAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission(PERMISSIONS.MAPS_WRITE);
  const parsed = roomUpdateSchema.safeParse({
    roomId: formData.get("roomId"),
    number: formData.get("number"),
    name: formData.get("name"),
    department: formData.get("department"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { roomId, number, name, department } = parsed.data;
  const room = await prisma.room.update({
    where: { id: roomId },
    data: { number, name: name || null, department: department || null },
  });
  await logAudit({
    action: AUDIT_ACTIONS.ROOM_UPDATED,
    actorUserId: actor.id,
    targetType: "room",
    targetId: roomId,
  });
  editorPath(room.floorPlanId);
  return { success: "Room updated." };
}

export async function moveRoomAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.MAPS_WRITE);
  const parsed = roomMoveSchema.safeParse({
    roomId: formData.get("roomId"),
    x: formData.get("x"),
    y: formData.get("y"),
  });
  if (!parsed.success) return;
  const room = await prisma.room.update({
    where: { id: parsed.data.roomId },
    data: { x: parsed.data.x, y: parsed.data.y },
  });
  await logAudit({
    action: AUDIT_ACTIONS.ROOM_UPDATED,
    actorUserId: actor.id,
    targetType: "room",
    targetId: room.id,
    metadata: { moved: true },
  });
  editorPath(room.floorPlanId);
}

export async function deleteRoomAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.MAPS_WRITE);
  const roomId = String(formData.get("roomId"));
  const room = await prisma.room.delete({ where: { id: roomId } });
  await logAudit({
    action: AUDIT_ACTIONS.ROOM_DELETED,
    actorUserId: actor.id,
    targetType: "room",
    targetId: roomId,
  });
  editorPath(room.floorPlanId);
}

// --- Floor plan ------------------------------------------------------------

export async function updateFloorPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission(PERMISSIONS.MAPS_WRITE);
  const parsed = floorPlanUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    building: formData.get("building"),
    floor: formData.get("floor"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { id, name, building, floor } = parsed.data;
  await prisma.floorPlan.update({
    where: { id },
    data: { name, building: building || null, floor: floor || null },
  });
  await logAudit({
    action: AUDIT_ACTIONS.FLOORPLAN_UPDATED,
    actorUserId: actor.id,
    targetType: "floorplan",
    targetId: id,
  });
  editorPath(id);
  return { success: "Floor plan updated." };
}

export async function deleteFloorPlanAction(formData: FormData): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.MAPS_WRITE);
  const id = String(formData.get("id"));
  await prisma.floorPlan.delete({ where: { id } });
  await logAudit({
    action: AUDIT_ACTIONS.FLOORPLAN_DELETED,
    actorUserId: actor.id,
    targetType: "floorplan",
    targetId: id,
  });
  revalidatePath("/admin/floorplans");
}
