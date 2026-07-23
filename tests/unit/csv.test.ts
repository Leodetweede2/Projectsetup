import { describe, it, expect } from "vitest";
import { csvEscape, toCsv, assetRowsToCsv } from "@/lib/assets/csv";

describe("csvEscape", () => {
  it("leaves plain values untouched", () => {
    expect(csvEscape("NC_04_680")).toBe("NC_04_680");
  });

  it("quotes values with commas, quotes, or newlines", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('he said "hi"')).toBe('"he said ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("toCsv", () => {
  it("joins headers and rows with CRLF and a trailing newline", () => {
    const csv = toCsv(["A", "B"], [["1", "2"], ["3", "4"]]);
    expect(csv).toBe("A,B\r\n1,2\r\n3,4\r\n");
  });
});

describe("assetRowsToCsv", () => {
  it("follows column order and fills missing cells", () => {
    const csv = assetRowsToCsv(
      ["Room", "PC"],
      [{ data: { Room: "H1.001", PC: "PC-1" } }, { data: { Room: "H1.002" } }],
    );
    expect(csv).toBe("Room,PC\r\nH1.001,PC-1\r\nH1.002,\r\n");
  });

  it("escapes values that need quoting", () => {
    const csv = assetRowsToCsv(["Note"], [{ data: { Note: "a,b" } }]);
    expect(csv).toBe('Note\r\n"a,b"\r\n');
  });
});
