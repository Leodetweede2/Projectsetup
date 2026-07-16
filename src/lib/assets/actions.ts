"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";

/** Remove the imported asset list. */
export async function clearAssetListAction(): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.MAPS_WRITE);
  await prisma.assetImport.deleteMany({});
  await logAudit({ action: AUDIT_ACTIONS.ASSET_LIST_CLEARED, actorUserId: actor.id });
  revalidatePath("/admin/assets");
  revalidatePath("/list");
}
