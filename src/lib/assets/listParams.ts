/**
 * Helpers for the asset-list drill-down URLs used by the dashboard.
 *
 * A dashboard breakdown (department, OS, pivot cell…) links to
 * `/list?col=<column>&val=<value>` (optionally a second `col2`/`val2` pair).
 * The list page turns those params into initial per-column filters.
 */

export interface DrillParams {
  col?: string;
  val?: string;
  col2?: string;
  val2?: string;
}

/**
 * Build the initial per-column filter map for the asset table from drill-down
 * params, keeping only pairs whose column actually exists in the import.
 */
export function buildInitialFilters(
  params: DrillParams,
  columns: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (col?: string, val?: string) => {
    if (col && val != null && val !== "" && columns.includes(col)) out[col] = val;
  };
  add(params.col, params.val);
  add(params.col2, params.val2);
  return out;
}

/** Build a `/list` drill-down href for one or two column=value filters. */
export function listDrillHref(
  filters: { col: string; val: string }[],
  extra?: Record<string, string>,
): string {
  const q = new URLSearchParams();
  filters.slice(0, 2).forEach((f, i) => {
    q.set(i === 0 ? "col" : "col2", f.col);
    q.set(i === 0 ? "val" : "val2", f.val);
  });
  for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
  return `/list?${q.toString()}`;
}
