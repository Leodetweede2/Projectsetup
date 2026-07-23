import { describe, it, expect } from "vitest";
import { formatTimeAgo, daysSince } from "@/lib/format";

const NOW = new Date("2026-07-23T12:00:00Z").getTime();
const ago = (ms: number) => new Date(NOW - ms);
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatTimeAgo", () => {
  it("says 'just now' for very recent times", () => {
    expect(formatTimeAgo(ago(5 * SEC), NOW)).toBe("just now");
  });

  it("uses minutes, hours, days, months, years", () => {
    expect(formatTimeAgo(ago(5 * MIN), NOW)).toBe("5 minutes ago");
    expect(formatTimeAgo(ago(1 * HOUR), NOW)).toBe("1 hour ago");
    expect(formatTimeAgo(ago(3 * DAY), NOW)).toBe("3 days ago");
    expect(formatTimeAgo(ago(60 * DAY), NOW)).toBe("2 months ago");
    expect(formatTimeAgo(ago(400 * DAY), NOW)).toBe("1 year ago");
  });
});

describe("daysSince", () => {
  it("counts whole days and never goes negative", () => {
    expect(daysSince(ago(3 * DAY), NOW)).toBe(3);
    expect(daysSince(ago(-DAY), NOW)).toBe(0); // future date clamps to 0
  });
});
