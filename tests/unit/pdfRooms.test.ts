import { describe, expect, it } from "vitest";
import { extractRoomPins, DEFAULT_ROOM_PATTERN, type PdfTextItem } from "@/lib/maps/pdfRooms";

// Identity viewport transform: text-item (e,f) maps straight to pixels.
const IDENTITY = [1, 0, 0, 1, 0, 0];
const W = 1000;
const H = 500;

function item(str: string, x: number, y: number): PdfTextItem {
  return { str, transform: [1, 0, 0, 1, x, y] };
}

describe("extractRoomPins", () => {
  it("maps room codes to 0..1 fractions", () => {
    const rooms = extractRoomPins(
      [item("NC_04_680", 500, 250), item("NL_04_681", 100, 400)],
      IDENTITY,
      W,
      H,
    );
    expect(rooms).toHaveLength(2);
    expect(rooms[0]).toMatchObject({ number: "NC_04_680", x: 0.5, y: 0.5 });
    expect(rooms[1]).toMatchObject({ number: "NL_04_681", x: 0.1, y: 0.8 });
  });

  it("ignores non-room text and pairs the nearest label as the name", () => {
    const rooms = extractRoomPins(
      [
        item("1-pers. pat.kr.", 300, 251),
        item("NC_04_043", 300, 250),
        item("afmeting 3648", 800, 100),
      ],
      IDENTITY,
      W,
      H,
    );
    expect(rooms).toHaveLength(1);
    expect(rooms[0].number).toBe("NC_04_043");
    expect(rooms[0].name).toBe("1-pers. pat.kr.");
  });

  it("de-duplicates by normalised code (- vs _ ) and clamps to range", () => {
    const rooms = extractRoomPins(
      [item("NC_04-045_a", 500, 250), item("NC_04_045_A", 510, 255), item("XX_01_001", 2000, -50)],
      IDENTITY,
      W,
      H,
    );
    // First two collapse to one; the third clamps into range.
    expect(rooms.filter((r) => r.number.toUpperCase().replace(/[_-]/g, "") === "NC04045A")).toHaveLength(1);
    const clamped = rooms.find((r) => r.number === "XX_01_001")!;
    expect(clamped.x).toBe(1);
    expect(clamped.y).toBe(0);
  });

  it("default pattern matches the NC_04_680 style but not plain numbers", () => {
    expect(DEFAULT_ROOM_PATTERN.test("NC_04_680")).toBe(true);
    expect(DEFAULT_ROOM_PATTERN.test("NC_04-045_a")).toBe(true);
    expect(DEFAULT_ROOM_PATTERN.test("3648")).toBe(false);
    expect(DEFAULT_ROOM_PATTERN.test("trap1")).toBe(false);
  });
});
