"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { listDrillHref } from "@/lib/assets/listParams";
import type { PivotStats } from "@/lib/maps/browse";

const isReal = (v: string) => !!v && !v.startsWith("—");

/**
 * Interactive pivot table for the asset list. The two dimension selectors change
 * the query params, which re-renders the (server-computed) table. Row/column
 * headers and cells drill through to the asset list, pre-filtered.
 */
export function Pivot({ stats }: { stats: PivotStats }) {
  const router = useRouter();
  const { available, rowCol, colCol, rowKeys, colKeys, counts, rowTotals, colTotals, total } =
    stats;

  const max = Math.max(1, ...counts.flat());

  function go(nextRow: string, nextCol: string) {
    const q = new URLSearchParams({ prow: nextRow, pcol: nextCol });
    router.push(`/dashboard?${q.toString()}#pivot`);
  }

  const selectCls =
    "h-8 rounded-md border border-line bg-surface px-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-muted">
        <label className="flex items-center gap-1.5">
          Rows
          <select className={selectCls} value={rowCol} onChange={(e) => go(e.target.value, colCol)}>
            {available.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <span aria-hidden>×</span>
        <label className="flex items-center gap-1.5">
          Columns
          <select className={selectCls} value={colCol} onChange={(e) => go(rowCol, e.target.value)}>
            {available.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <span className="text-ink-faint">· counts of PCs</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2">
              <th className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-left font-semibold text-ink">
                {rowCol}
              </th>
              {colKeys.map((ck) => (
                <th key={ck} className="px-3 py-2 text-right font-medium text-ink-muted" title={ck}>
                  {isReal(ck) ? (
                    <Link
                      href={listDrillHref([{ col: colCol, val: ck }])}
                      className="hover:text-brand-600 hover:underline"
                    >
                      {ck}
                    </Link>
                  ) : (
                    ck
                  )}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-semibold text-ink">Total</th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((rk, i) => (
              <tr key={rk} className="border-t border-line">
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-56 truncate bg-surface px-3 py-1.5 text-left font-medium text-ink"
                  title={rk}
                >
                  {isReal(rk) ? (
                    <Link
                      href={listDrillHref([{ col: rowCol, val: rk }])}
                      className="hover:text-brand-600 hover:underline"
                    >
                      {rk}
                    </Link>
                  ) : (
                    rk
                  )}
                </th>
                {colKeys.map((ck, j) => {
                  const n = counts[i][j];
                  const alpha = n > 0 ? 0.08 + 0.5 * (n / max) : 0;
                  const drillable = n > 0 && isReal(rk) && isReal(ck);
                  return (
                    <td
                      key={ck}
                      className="p-0 text-right tabular-nums text-ink"
                      style={n > 0 ? { backgroundColor: `rgba(45, 118, 170, ${alpha.toFixed(3)})` } : undefined}
                    >
                      {drillable ? (
                        <Link
                          href={listDrillHref([
                            { col: rowCol, val: rk },
                            { col: colCol, val: ck },
                          ])}
                          className="block px-3 py-1.5 hover:underline"
                          title={`${rk} · ${ck}: ${n} PC(s)`}
                        >
                          {n}
                        </Link>
                      ) : (
                        <span className="block px-3 py-1.5">{n || ""}</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-ink">
                  {rowTotals[i]}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line bg-surface-2">
              <th className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-left font-semibold text-ink">
                Total
              </th>
              {colTotals.map((t, j) => (
                <td key={j} className="px-3 py-2 text-right font-semibold tabular-nums text-ink">
                  {t}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-bold tabular-nums text-ink">{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
