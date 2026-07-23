/**
 * Client-safe PC-activity bucketing (no Prisma imports), shared by the
 * dashboard stats and the asset-list "last seen" filter.
 */

export type ActivityBucket = "active" | "recent" | "stale" | "unknown";

export const ACTIVITY_BUCKETS: ActivityBucket[] = ["active", "recent", "stale", "unknown"];

export const ACTIVITY_LABELS: Record<ActivityBucket, string> = {
  active: "Active (≤30 days)",
  recent: "30–90 days",
  stale: "Inactive (90+ days)",
  unknown: "Unknown / no date",
};

/** Bucket a "last seen" date string by how long ago it was. */
export function activityBucket(value: string | undefined, now: number = Date.now()): ActivityBucket {
  const v = (value ?? "").trim();
  const t = v ? Date.parse(v) : NaN;
  if (Number.isNaN(t)) return "unknown";
  const days = (now - t) / 86_400_000;
  if (days <= 30) return "active";
  if (days <= 90) return "recent";
  return "stale";
}
