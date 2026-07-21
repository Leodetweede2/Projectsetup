/**
 * Extract room pins from a PDF page's text layer.
 *
 * Floor-plan PDFs contain positioned text tokens like "NC_04_680" (wing, floor,
 * room, optional suffix). This turns those tokens into pins by mapping each text
 * item's transform into image space and normalising to 0..1 fractions.
 *
 * Pure and dependency-free (no pdfjs import) so it is easy to unit-test — the
 * caller passes `page.getTextContent().items` and `viewport.transform`.
 */

export interface PdfTextItem {
  str: string;
  /** pdfjs text-item transform matrix [a,b,c,d,e,f]. */
  transform: number[];
}

export interface ExtractedRoom {
  number: string;
  name?: string;
  /** Position as a fraction (0..1) of the image width/height. */
  x: number;
  y: number;
}

/** Default room-code pattern: e.g. NC_04_680, NL_04_681, NC_04-045_a. */
export const DEFAULT_ROOM_PATTERN = /^[A-Za-z]{2}[ _-]?\d{2}[ _-]?\d{2,4}([ _-]?[A-Za-z])?$/;

/** Multiply two 2D affine transforms (same as pdfjs `Util.transform`). */
function multiply(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function stripped(s: string): string {
  return s.replace(/\s+/g, "");
}

/**
 * Extract deduplicated room pins from a page's text items.
 * @param items text items from `page.getTextContent()`
 * @param viewportTransform `viewport.transform` from the viewport used to render
 * @param width rendered image width in pixels
 * @param height rendered image height in pixels
 * @param pattern room-code pattern (defaults to the NC_04_680 style)
 */
export function extractRoomPins(
  items: PdfTextItem[],
  viewportTransform: number[],
  width: number,
  height: number,
  pattern: RegExp = DEFAULT_ROOM_PATTERN,
): ExtractedRoom[] {
  const points = items
    .map((it) => {
      const t = multiply(viewportTransform, it.transform);
      return { s: it.str.replace(/\s+/g, " ").trim(), x: t[4] / width, y: t[5] / height };
    })
    .filter((p) => p.s.length > 0);

  const isCode = (s: string) => pattern.test(stripped(s));
  const labels = points.filter((p) => !isCode(p.s));

  const seen = new Set<string>();
  const out: ExtractedRoom[] = [];
  for (const p of points) {
    if (!isCode(p.s)) continue;
    const code = stripped(p.s);
    const key = code.toUpperCase().replace(/[\s._-]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);

    // Pair with the nearest label (room type) within a small radius.
    let name: string | undefined;
    let best = 0.02;
    for (const l of labels) {
      const d = Math.hypot(l.x - p.x, l.y - p.y);
      if (d < best) {
        best = d;
        name = l.s;
      }
    }

    out.push({ number: code, name, x: clamp01(p.x), y: clamp01(p.y) });
  }
  return out;
}
