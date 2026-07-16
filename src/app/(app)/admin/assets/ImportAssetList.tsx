"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

type Row = Record<string, unknown>;

const GUESS = /ruimte|room|kamer|locatie|location/i;

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
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
      if (parsed.length === 0) {
        setError("That file has no data rows.");
        return;
      }
      const cols = Object.keys(parsed[0]);
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
