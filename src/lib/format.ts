/** Small, pure formatting helpers shared across the app. */

/**
 * Human "time ago" for a past date, rounded to the largest sensible unit.
 * Returns e.g. "just now", "3 hours ago", "5 days ago", "2 months ago".
 */
export function formatTimeAgo(date: Date, now: number = Date.now()): string {
  const secs = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** Whole days between `date` and now (non-negative). */
export function daysSince(date: Date, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - date.getTime()) / 86_400_000));
}
