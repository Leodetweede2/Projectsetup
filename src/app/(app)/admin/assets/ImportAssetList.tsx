"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

type Row = Record<string, unknown>;
type XLSXModule = typeof import("xlsx");
type WorkBook = import("xlsx").WorkBook;
type WorkSheet = import("xlsx").WorkSheet;

const GUESS = /ruimte|room|kamer|locatie|location/i;

/** Decode a byte buffer to text, honouring a UTF-16 BOM (common in exports). */
function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}

/** Recompute a sheet's used range from its actual cells (fixes a stale/narrow !ref). */
function computeRange(XLSX: XLSXModule, ws: WorkSheet) {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (const addr of Object.keys(ws)) {
    if (addr[0] === "!") continue;
    const { r, c } = XLSX.utils.decode_cell(addr);
    if (r > range.e.r) range.e.r = r;
    if (c > range.e.c) range.e.c = c;
    if (r < range.s.r) range.s.r = r;
    if (c < range.s.c) range.s.c = c;
  }
  ws["!ref"] = XLSX.utils.encode_range(range);
  return range;
}

/** Column headers of a sheet, taken positionally from the header row. */
function sheetHeaders(XLSX: XLSXModule, ws: WorkSheet | undefined): string[] {
  if (!ws || !ws["!ref"]) return [];
  const range = computeRange(XLSX, ws);
  const out: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c })];
    const name = cell ? String(cell.w ?? cell.v ?? "").trim() : "";
    out.push(name || `Column ${c - range.s.c + 1}`);
  }
  return out;
}

/** Full parse of a sheet into { columns, rows }. */
function sheetData(XLSX: XLSXModule, ws: WorkSheet | undefined): { cols: string[]; rows: Row[] } {
  const cols = sheetHeaders(XLSX, ws);
  if (!ws || cols.length === 0) return { cols: [], rows: [] };
  const aoa = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  }) as unknown[][];
  const rows: Row[] = aoa.slice(1).map((arr) => {
    const obj: Row = {};
    cols.forEach((col, i) => {
      const v = arr[i];
      obj[col] = v == null ? "" : String(v);
    });
    return obj;
  });
  return { cols, rows };
}

/**
 * Parse any tabular export into a workbook, regardless of whether it is a real
 * xlsx/xls or a mislabelled text export (CSV/TSV/HTML, UTF-8 or UTF-16). For
 * text, tries several delimiters and keeps whichever yields the most columns.
 */
function readWorkbook(XLSX: XLSXModule, buf: ArrayBuffer): WorkBook | null {
  const bytes = new Uint8Array(buf);
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // xlsx (PK zip)
  const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf; // xls (OLE)

  if (isZip || isOle) {
    try {
      return XLSX.read(buf, { type: "array", cellDates: true });
    } catch {
      return null;
    }
  }

  const text = decodeText(bytes);
  const candidates: WorkBook[] = [];
  const tryPush = (fn: () => WorkBook) => {
    try {
      candidates.push(fn());
    } catch {
      /* ignore */
    }
  };
  tryPush(() => XLSX.read(text, { type: "string", cellDates: true }));
  for (const FS of ["\t", ";", ","]) {
    tryPush(() => XLSX.read(text, { type: "string", FS, cellDates: true }));
  }

  let best: WorkBook | null = null;
  let bestCols = -1;
  for (const wb of candidates) {
    const n = sheetHeaders(XLSX, wb.Sheets[wb.SheetNames[0]]).length;
    if (n > bestCols) {
      bestCols = n;
      best = wb;
    }
  }
  return best;
}

/** Choose a sensible default sheet: first with a room-ish column, else most columns. */
function defaultSheet(XLSX: XLSXModule, wb: WorkBook): string {
  for (const name of wb.SheetNames) {
    if (sheetHeaders(XLSX, wb.Sheets[name]).some((c) => GUESS.test(c))) return name;
  }
  let best = wb.SheetNames[0];
  let bestN = -1;
  for (const name of wb.SheetNames) {
    const n = sheetHeaders(XLSX, wb.Sheets[name]).length;
    if (n > bestN) {
      bestN = n;
      best = name;
    }
  }
  return best;
}

export function ImportAssetList() {
  const router = useRouter();
  const [wb, setWb] = useState<WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheet, setSheet] = useState("");
  const [filename, setFilename] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [roomCol, setRoomCol] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function applySheet(XLSX: XLSXModule, workbook: WorkBook, name: string) {
    const { cols, rows: parsed } = sheetData(XLSX, workbook.Sheets[name]);
    setColumns(cols);
    setRows(parsed);
    setRoomCol(cols.find((c) => GUESS.test(c)) ?? cols[0] ?? "");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const workbook = readWorkbook(XLSX, buf);
      if (!workbook || workbook.SheetNames.length === 0) {
        setError("Could not read that file.");
        return;
      }
      const name = defaultSheet(XLSX, workbook);
      setFilename(file.name);
      setWb(workbook);
      setSheetNames(workbook.SheetNames);
      setSheet(name);
      applySheet(XLSX, workbook, name);
    } catch (err) {
      setError(`Could not read the file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function onSheetChange(name: string) {
    if (!wb) return;
    setSheet(name);
    setSuccess(null);
    const XLSX = await import("xlsx");
    applySheet(XLSX, wb, name);
  }

  async function onImport() {
    if (!rows.length || !roomCol) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/assets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, roomNumberColumn: roomCol, columns, rows }),
      });
      const raw = await res.text();
      let data: { rowCount?: number; error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        /* non-JSON */
      }
      if (!res.ok) {
        throw new Error(data.error ?? `Import failed (HTTP ${res.status})`);
      }
      setSuccess(`Imported ${data.rowCount} rows from ${filename} (sheet "${sheet}").`);
      setRows([]);
      setColumns([]);
      setSheetNames([]);
      setWb(null);
      setFilename("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const preview = rows.slice(0, 5);

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div>
        <Label htmlFor="xlsx">Excel file (.xlsx, .xls, .csv)</Label>
        <input
          id="xlsx"
          type="file"
          accept=".xlsx,.xls,.csv,.tsv,.txt"
          onChange={onFile}
          className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        />
      </div>

      {sheetNames.length > 1 && (
        <div>
          <Label htmlFor="sheet">Sheet</Label>
          <select
            id="sheet"
            value={sheet}
            onChange={(e) => onSheetChange(e.target.value)}
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {sheetNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-faint">
            This workbook has {sheetNames.length} sheets — pick the one with your PC list.
          </p>
        </div>
      )}

      {columns.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="roomcol">Which column is the room number?</Label>
              <select
                id="roomcol"
                value={roomCol}
                onChange={(e) => setRoomCol(e.target.value)}
                className="h-10 rounded-md border border-line bg-surface px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-ink-faint">
              {rows.length} rows · {columns.length} columns
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-muted">Preview (first 5 rows)</p>
            <Table>
              <THead>
                <TR>
                  {columns.map((c) => (
                    <TH
                      key={c}
                      className={c === roomCol ? "text-brand-700 dark:text-brand-300" : undefined}
                    >
                      {c}
                      {c === roomCol ? " (room #)" : ""}
                    </TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {preview.map((r, i) => (
                  <TR key={i}>
                    {columns.map((c) => (
                      <TD key={c}>{String(r[c] ?? "")}</TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <Button type="button" onClick={onImport} disabled={busy}>
            {busy ? "Importing…" : `Import ${rows.length} rows`}
          </Button>
          <p className="text-xs text-ink-faint">
            Importing replaces the current list with this file&apos;s contents.
          </p>
        </>
      )}
    </div>
  );
}
