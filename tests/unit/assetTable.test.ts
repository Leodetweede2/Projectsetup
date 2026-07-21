import { describe, expect, it } from "vitest";
import { filterSortRows, type AssetTableRow } from "@/lib/assets/table";

const columns = ["Room", "PC", "OS"];
const rows: AssetTableRow[] = [
  { id: "1", data: { Room: "NC_04_002", PC: "AMP-PC-10", OS: "Windows 11" }, roomId: "r1" },
  { id: "2", data: { Room: "NC_04_010", PC: "AMP-PC-2", OS: "Windows 10" }, roomId: null },
  { id: "3", data: { Room: "NC_04_001", PC: "AMP-PC-100", OS: "Windows 11" }, roomId: "r3" },
];

describe("filterSortRows", () => {
  it("global search matches any column, case-insensitively", () => {
    expect(filterSortRows(rows, columns, { query: "windows 10" }).map((r) => r.id)).toEqual(["2"]);
    expect(filterSortRows(rows, columns, { query: "amp-pc" })).toHaveLength(3);
  });

  it("per-column filters combine (AND)", () => {
    const out = filterSortRows(rows, columns, { filters: { OS: "11", Room: "002" } });
    expect(out.map((r) => r.id)).toEqual(["1"]);
  });

  it("sorts numeric-aware ascending and descending", () => {
    const asc = filterSortRows(rows, columns, { sortCol: "PC", sortDir: "asc" }).map((r) => r.data.PC);
    // Numeric-aware: PC-2 < PC-10 < PC-100
    expect(asc).toEqual(["AMP-PC-2", "AMP-PC-10", "AMP-PC-100"]);
    const desc = filterSortRows(rows, columns, { sortCol: "PC", sortDir: "desc" }).map((r) => r.data.PC);
    expect(desc).toEqual(["AMP-PC-100", "AMP-PC-10", "AMP-PC-2"]);
  });

  it("returns all rows when no options are given", () => {
    expect(filterSortRows(rows, columns, {})).toHaveLength(3);
  });
});
