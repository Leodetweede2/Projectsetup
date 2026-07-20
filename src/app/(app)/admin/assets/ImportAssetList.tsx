"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

type Row = Record<string, unknown>;
type XLSXModule = typeof import("xlsx");

const GUESS = /ruimte|room|kamer|locatie|location/i;

/** Decode a byte buffer to text, honouring a UTF-16 BOM (common in exports). */
function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}

/**
 * Read the first sheet of a parsed workbook into { columns, rows }. Recomputes
 * the used range from the actual cells and takes columns positionally from the
 * header row, so every column is captured.
 */
function readFirstSheet(XLSX: XLSXModule, wb: import("xlsx").WorkBook): {
  cols: string[];
  rows: Row[];
} {
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { cols: [], rows: [] };

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

  const aoa = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  }) as unknown[][];
  if (aoa.length < 2) return { cols: [], rows: [] };

  const headerRow = aoa[0] ?? [];
  const cols = headerRow.map((h, i) => String(h ?? "").trim() || `Column ${i + 1}`);
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
 * Parse any tabular export into columns + rows, regardless of whether it is a
 * real xlsx/xls or a mislabelled text export (CSV/TSV/HTML, UTF-8 or UTF-16).
 * Tries multiple strategies and keeps whichever yields the most columns.
 */
function parseTabular(XLSX: XLSXModule, buf: ArrayBuffer): { cols: string[]; rows: Row[] } {
  const bytes = new Uint8Array(buf);
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // xlsx (PK zip)
  const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf; // xls (OLE)

  const candidates: { cols: string[]; rows: Row[] }[] = [];
  const tryPush = (fn: () => { cols: string[]; rows: Row[] }) => {
    try {
      candidates.push(fn());
    } catch {
      /* ignore this strategy */
    }
  };

  if (isZip || isOle) {
    tryPush(() => readFirstSheet(XLSX, XLSX.read(buf, { type: "array", cellDates: true })));
  } else {
    const text = decodeText(bytes);
    // Auto (SheetJS sniffs HTML tables and CSV delimiters)…
    tryPush(() => readFirstSheet(XLSX, XLSX.read(text, { type: "string", cellDates: true })));
    // …plus explicit delimiters for tab / semicolon / comma exports.
    for (const FS of ["\t", ";", ","]) {
      tryPush(() => readFirstSheet(XLSX, XLSX.read(text, { type: "string", FS, cellDates: true })));
    }
  }
  // Last resort: let SheetJS guess from the raw bytes.
  tryPush(() => readFirstSheet(XLSX, XLSX.read(buf, { type: "array", cellDates: true })));

  const best = candidates
    .filter((c) => c.cols.length > 0)
    .sort((a, b) => b.cols.length - a.cols.length)[0];
  return best ?? { cols: [], rows: [] };
}

export function ImportAssetList() {
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [roomCol, setRoomCol] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const { cols, rows: parsed } = parseTabular(XLSX, buf);

      if (cols.length === 0 || parsed.length === 0) {
        setError("Could not read any columns/rows from that file.");
        return;
      }

      setFilename(file.name);
      setColumns(cols);
      setRows(parsed);
      setRoomCol(cols.find((c) => GUESS.test(c)) ?? cols[0]);
    } catch (err) {
      setError(`Could not read the file: ${err instanceof Error ? err.message : String(err)}`);
    }
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
      setSuccess(`Imported ${data.rowCount} rows from ${filename}.`);
      setRows([]);
      setColumns([]);
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
          accept=".xlsx,.xls,.csv"
          onChange={onFile}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        />
      </div>

      {columns.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="roomcol">Which column is the room number?</Label>
              <select
                id="roomcol"
                value={roomCol}
                onChange={(e) => setRoomCol(e.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-slate-500">
              {rows.length} rows · {columns.length} columns
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Preview (first 5 rows)</p>
            <Table>
              <THead>
                <TR>
                  {columns.map((c) => (
                    <TH key={c} className={c === roomCol ? "text-brand-700" : undefined}>
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
          <p className="text-xs text-slate-400">
            Importing replaces the current list with this file&apos;s contents.
          </p>
        </>
      )}
    </div>
  );
}
