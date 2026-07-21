"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { filterSortRows, type AssetTableRow, type SortDir } from "@/lib/assets/table";

interface Props {
  columns: string[];
  rows: AssetTableRow[];
  roomNumberColumn: string;
}

const PAGE_SIZE = 50;

export function AssetTable({ columns, rows, roomNumberColumn }: Props) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);

  const processed = useMemo(
    () => filterSortRows(rows, columns, { query, filters, sortCol, sortDir }),
    [rows, columns, query, filters, sortCol, sortDir],
  );

  const pageCount = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = processed.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(col: string) {
    setPage(0);
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortCol(null);
    }
  }

  function setFilter(col: string, val: string) {
    setPage(0);
    setFilters((f) => ({ ...f, [col]: val }));
  }

  const activeFilters = Object.values(filters).some((v) => v.trim()) || query.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search all columns…"
          className="h-10 w-72 rounded-md border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        {activeFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setFilters({});
              setPage(0);
            }}
          >
            Clear filters
          </Button>
        )}
        <span className="text-sm text-slate-500">
          {processed.length} of {rows.length} rows
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              {columns.map((c) => (
                <TH key={c}>
                  <button
                    type="button"
                    onClick={() => toggleSort(c)}
                    className="flex items-center gap-1 font-medium hover:text-slate-900"
                  >
                    {c}
                    <span className="text-slate-400">
                      {sortCol === c ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </TH>
              ))}
              <TH className="text-right">Location</TH>
            </TR>
            <TR>
              {columns.map((c) => (
                <TH key={c} className="py-1">
                  <input
                    value={filters[c] ?? ""}
                    onChange={(e) => setFilter(c, e.target.value)}
                    placeholder="filter"
                    className="h-7 w-full min-w-24 rounded border border-slate-200 px-2 text-xs font-normal focus:border-brand-500 focus:outline-none"
                  />
                </TH>
              ))}
              <TH className="py-1" />
            </TR>
          </THead>
          <TBody>
            {pageRows.map((r) => (
              <TR key={r.id}>
                {columns.map((c) => (
                  <TD key={c} className={c === roomNumberColumn ? "font-medium text-slate-900" : ""}>
                    {r.data[c] ?? ""}
                  </TD>
                ))}
                <TD className="text-right">
                  {r.roomId ? (
                    <Link
                      href={`/find/${r.roomId}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      Show on map →
                    </Link>
                  ) : (
                    <span className="text-slate-400">not on a map</span>
                  )}
                </TD>
              </TR>
            ))}
            {pageRows.length === 0 && (
              <TR>
                <TD colSpan={columns.length + 1} className="py-8 text-center text-slate-400">
                  No matching rows.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {current + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
