export interface AssetTableRow {
  id: string;
  data: Record<string, string>;
  /** Linked floor-plan room id, if the room number matches a placed pin. */
  roomId: string | null;
}

export type SortDir = "asc" | "desc";

export interface TableOptions {
  /** Global search across all columns. */
  query?: string;
  /** Per-column "contains" filters. */
  filters?: Record<string, string>;
  sortCol?: string | null;
  sortDir?: SortDir;
}

function rowMatches(row: AssetTableRow, columns: string[], query: string, filters: Record<string, string>) {
  if (query) {
    const q = query.toLowerCase();
    const anyHit = columns.some((c) => (row.data[c] ?? "").toLowerCase().includes(q));
    if (!anyHit) return false;
  }
  for (const [col, val] of Object.entries(filters)) {
    const f = val.trim().toLowerCase();
    if (f && !(row.data[col] ?? "").toLowerCase().includes(f)) return false;
  }
  return true;
}

/** Filter and sort asset rows (pure — used by the interactive table and tests). */
export function filterSortRows(
  rows: AssetTableRow[],
  columns: string[],
  { query = "", filters = {}, sortCol = null, sortDir = "asc" }: TableOptions,
): AssetTableRow[] {
  const out = rows.filter((r) => rowMatches(r, columns, query, filters));

  if (sortCol) {
    const dir = sortDir === "desc" ? -1 : 1;
    out.sort((a, b) => {
      const av = a.data[sortCol] ?? "";
      const bv = b.data[sortCol] ?? "";
      // Numeric-aware, case-insensitive comparison.
      return dir * av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
    });
  }
  return out;
}
