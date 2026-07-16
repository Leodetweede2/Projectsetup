"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

// pdfjs needs a worker; resolve it from the package (bundled by the build).
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Cap the rendered width so images stay a reasonable size.
const MAX_WIDTH = 2000;

export function UploadFloorPlan() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [rendered, setRendered] = useState(false);
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function renderPage(doc: pdfjsLib.PDFDocumentProxy, pageNumber: number) {
    const p = await doc.getPage(pageNumber);
    const base = p.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_WIDTH / base.width);
    const viewport = p.getViewport({ scale });
    const canvas = canvasRef.current!;
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await p.render({ canvas, canvasContext: ctx, viewport }).promise;
    setRendered(true);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setRendered(false);
    try {
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      setPdf(doc);
      setPageCount(doc.numPages);
      setPage(1);
      setName(file.name.replace(/\.pdf$/i, ""));
      await renderPage(doc, 1);
    } catch (err) {
      setError(`Could not read the PDF: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function onPageChange(next: number) {
    if (!pdf) return;
    setPage(next);
    setRendered(false);
    await renderPage(pdf, next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rendered || !canvasRef.current) return;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const canvas = canvasRef.current;
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to render image"))), "image/png"),
      );
      const fd = new FormData();
      fd.set("file", blob, "floorplan.png");
      fd.set("name", name.trim());
      fd.set("building", building.trim());
      fd.set("floor", floor.trim());
      fd.set("width", String(canvas.width));
      fd.set("height", String(canvas.height));

      const res = await fetch("/api/floorplans", { method: "POST", body: fd });
      const raw = await res.text();
      let data: { id?: string; error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        // Non-JSON response (e.g. a proxy error page).
      }
      if (!res.ok || !data.id) {
        throw new Error(
          data.error ?? `Upload failed (HTTP ${res.status})${raw ? `: ${raw.slice(0, 200)}` : ""}`,
        );
      }
      router.push(`/admin/floorplans/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}

      <div>
        <Label htmlFor="pdf">Floor plan PDF</Label>
        <input
          id="pdf"
          type="file"
          accept="application/pdf"
          onChange={onFile}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        />
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600">Page</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ‹
          </Button>
          <span className="tabular-nums">
            {page} / {pageCount}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            ›
          </Button>
        </div>
      )}

      <div className={rendered ? "block" : "hidden"}>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Preview</p>
        <div className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2">
          <canvas ref={canvasRef} className="max-w-full" />
        </div>
      </div>

      {rendered && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Label htmlFor="fp-name">Name</Label>
            <Input id="fp-name" value={name} onChange={(e) => setName(e.target.value)} required />
            <FieldError>{!name.trim() ? "Name is required" : undefined}</FieldError>
          </div>
          <div>
            <Label htmlFor="fp-building">Building</Label>
            <Input id="fp-building" value={building} onChange={(e) => setBuilding(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fp-floor">Floor</Label>
            <Input id="fp-floor" value={floor} onChange={(e) => setFloor(e.target.value)} />
          </div>
        </div>
      )}

      <Button type="submit" disabled={!rendered || busy}>
        {busy ? "Uploading…" : "Create floor plan"}
      </Button>
    </form>
  );
}
