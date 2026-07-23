/**
 * Minimal, dependency-free CSV serialisation for exporting the asset list.
 * Quotes fields that contain a comma, quote, or newline (RFC 4180 style) and
 * escapes embedded quotes by doubling them.
 */

export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build a CSV string from a header row and value rows. */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((cols) => cols.map(csvEscape).join(","));
  // Trailing newline keeps most spreadsheet importers happy.
  return lines.join("\r\n") + "\r\n";
}

/**
 * Serialise asset rows (keyed objects) into CSV following `columns` order.
 * Missing values become empty cells.
 */
export function assetRowsToCsv(
  columns: string[],
  rows: Array<{ data: Record<string, string | null | undefined> }>,
): string {
  const body = rows.map((r) => columns.map((c) => r.data[c] ?? ""));
  return toCsv(columns, body);
}
