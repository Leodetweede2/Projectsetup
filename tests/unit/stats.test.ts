import { describe, expect, it } from "vitest";
import {
  computeActivity,
  computeBreakdown,
  computeCore,
  computeDepartment,
  computeLocations,
  computePivot,
  detectColumn,
  type AssetData,
  type AssetRecordLite,
} from "@/lib/maps/stats";

const row = (o: AssetData): AssetData => o;

describe("detectColumn", () => {
  it("finds the department / OS / last-seen columns by header", () => {
    const cols = ["Ruimtenummer", "Afdeling", "Desktops.strOSName", "Desktops.dtmLastContact"];
    expect(detectColumn(cols, /afdeling|department/i)).toBe("Afdeling");
    expect(detectColumn(cols, /strosname|\bos\b/i)).toBe("Desktops.strOSName");
    expect(detectColumn(cols, /dtmlastcontact|last.?contact/i)).toBe("Desktops.dtmLastContact");
    expect(detectColumn(cols, /nope/i)).toBeNull();
  });
});

describe("computeCore", () => {
  it("counts located/unlocated PCs and rooms with PCs", () => {
    const stats = computeCore({
      floorPlans: 2,
      rooms: [
        { number: "H1.001" }, // no asset PC
        { number: "H1.002" }, // has an asset PC
        { number: "H1.003" }, // empty
      ],
      roomNorms: new Set(["H1001", "H1002", "H1003"]),
      assetRoomNumbers: ["H1002", "H1002", "H9999"], // 2 located (H1002), 1 unlocated
    });
    expect(stats.pcsTotal).toBe(3);
    expect(stats.pcsLocated).toBe(2);
    expect(stats.pcsUnlocated).toBe(1);
    expect(stats.locatedPct).toBe(67);
    expect(stats.rooms).toBe(3);
    expect(stats.roomsWithPcs).toBe(1); // only H1.002 has an asset PC
    expect(stats.floorPlans).toBe(2);
  });

  it("handles an empty asset list", () => {
    const stats = computeCore({
      floorPlans: 0,
      rooms: [],
      roomNorms: new Set(),
      assetRoomNumbers: [],
    });
    expect(stats.pcsTotal).toBe(0);
    expect(stats.locatedPct).toBe(0);
  });
});

describe("computeDepartment", () => {
  const recs: AssetRecordLite[] = [
    { roomNumber: "H1001", data: row({ Afdeling: "Radiologie" }) },
    { roomNumber: "H1002", data: row({ Afdeling: "Radiologie" }) },
    { roomNumber: "H9999", data: row({ Afdeling: "ICT" }) }, // unplaced
    { roomNumber: "H1003", data: row({ Afdeling: "" }) }, // unknown
  ];

  it("totals PCs per department and how many are placed", () => {
    const d = computeDepartment(recs, "Afdeling", new Set(["H1001", "H1002", "H1003"]));
    expect(d.column).toBe("Afdeling");
    expect(d.count).toBe(3); // Radiologie, ICT, "— (unknown)"
    const radiologie = d.top.find((t) => t.name === "Radiologie")!;
    expect(radiologie.total).toBe(2);
    expect(radiologie.located).toBe(2);
    const ict = d.top.find((t) => t.name === "ICT")!;
    expect(ict.located).toBe(0); // H9999 is not a placed room
    expect(d.top[0].name).toBe("Radiologie"); // sorted by total desc
  });

  it("returns empty when no department column is given", () => {
    expect(computeDepartment(recs, null, new Set())).toEqual({ column: null, count: 0, top: [] });
  });
});

describe("computePivot", () => {
  const data: AssetData[] = [
    row({ Afdeling: "Radiologie", Type: "Desktop" }),
    row({ Afdeling: "Radiologie", Type: "Laptop" }),
    row({ Afdeling: "Radiologie", Type: "Desktop" }),
    row({ Afdeling: "ICT", Type: "Desktop" }),
  ];

  it("cross-tabulates two columns with correct totals", () => {
    const p = computePivot(data, ["Afdeling", "Type"], "Afdeling", "Type")!;
    expect(p.rowCol).toBe("Afdeling");
    expect(p.colCol).toBe("Type");
    expect(p.total).toBe(4);
    const ri = p.rowKeys.indexOf("Radiologie");
    const di = p.colKeys.indexOf("Desktop");
    const li = p.colKeys.indexOf("Laptop");
    expect(p.counts[ri][di]).toBe(2);
    expect(p.counts[ri][li]).toBe(1);
    expect(p.rowTotals[ri]).toBe(3);
    expect(p.colTotals[di]).toBe(3); // 3 desktops total
  });

  it("defaults the dimensions and returns null without columns", () => {
    const p = computePivot(data, ["Afdeling", "Type"])!;
    expect(p.rowCol).toBe("Afdeling"); // detected department
    expect(p.colCol).toBe("Type"); // detected type/os
    expect(computePivot(data, [])).toBeNull();
  });

  it("blank cell values fall back to a dash", () => {
    const p = computePivot([row({ A: "", B: "" })], ["A", "B"], "A", "B")!;
    expect(p.rowKeys).toEqual(["—"]);
  });
});

describe("computeBreakdown", () => {
  it("counts values of a column, descending", () => {
    const data: AssetData[] = [
      row({ OS: "Windows 11" }),
      row({ OS: "Windows 11" }),
      row({ OS: "Windows 10" }),
      row({ OS: "" }),
    ];
    const b = computeBreakdown(data, "OS");
    expect(b.total).toBe(4);
    expect(b.top[0]).toEqual({ name: "Windows 11", count: 2 });
    expect(b.top.find((t) => t.name === "— (unknown)")!.count).toBe(1);
  });
});

describe("computeActivity", () => {
  const now = Date.parse("2026-07-22T00:00:00Z");
  it("buckets by how long ago the PC last checked in", () => {
    const data: AssetData[] = [
      row({ last: "2026-07-20" }), // 2 days → active
      row({ last: "2026-06-15" }), // ~37 days → recent
      row({ last: "2026-01-10" }), // >90 days → stale
      row({ last: "" }), // unknown
      row({ last: "not-a-date" }), // unknown
    ];
    const a = computeActivity(data, "last", now);
    expect(a.active).toBe(1);
    expect(a.recent).toBe(1);
    expect(a.stale).toBe(1);
    expect(a.unknown).toBe(2);
    expect(a.total).toBe(5);
  });
});

describe("computeLocations", () => {
  it("counts rooms and PCs per plan, assigning each PC to the first matching plan", () => {
    const plans = [
      { label: "Molengracht · Floor 1", roomNorms: ["H1001", "H1002"] },
      { label: "Molengracht · Floor 2", roomNorms: ["H2001"] },
    ];
    const locs = computeLocations(plans, ["H1001", "H1001", "H2001", "H9999"]);
    expect(locs[0]).toEqual({ label: "Molengracht · Floor 1", rooms: 2, pcs: 2 });
    expect(locs[1]).toEqual({ label: "Molengracht · Floor 2", rooms: 1, pcs: 1 });
    // H9999 matches no plan and is not counted anywhere.
  });
});
