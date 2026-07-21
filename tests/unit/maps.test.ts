import { describe, expect, it } from "vitest";
import { clamp01, planLabel, normalizeRoomNumber } from "@/lib/maps/search";

describe("clamp01", () => {
  it("keeps values within 0..1", () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
  });

  it("treats NaN as 0", () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe("planLabel", () => {
  it("combines building and floor", () => {
    expect(planLabel({ name: "Plan", building: "H", floor: "1" })).toBe("Building H · Floor 1");
  });

  it("uses whichever part is present", () => {
    expect(planLabel({ name: "Plan", building: "H", floor: null })).toBe("Building H");
    expect(planLabel({ name: "Plan", building: null, floor: "2" })).toBe("Floor 2");
  });

  it("falls back to the name when nothing else is set", () => {
    expect(planLabel({ name: "Ground floor", building: null, floor: null })).toBe("Ground floor");
  });
});

describe("normalizeRoomNumber", () => {
  it("upper-cases and removes whitespace and separators", () => {
    expect(normalizeRoomNumber("h1.001")).toBe("H1001");
    expect(normalizeRoomNumber("  H1.001 ")).toBe("H1001");
    expect(normalizeRoomNumber("H 1.001")).toBe("H1001");
  });

  it("bridges - / _ / . so PDF codes match Excel values", () => {
    expect(normalizeRoomNumber("NC_04-045_a")).toBe(normalizeRoomNumber("NC_04_045_A"));
    expect(normalizeRoomNumber("A0-001")).toBe(normalizeRoomNumber("A0_001"));
  });

  it("handles nullish / numeric values", () => {
    expect(normalizeRoomNumber(null)).toBe("");
    expect(normalizeRoomNumber(undefined)).toBe("");
    expect(normalizeRoomNumber(101)).toBe("101");
  });
});
