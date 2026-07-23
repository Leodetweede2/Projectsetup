import { describe, it, expect } from "vitest";
import { activityBucket } from "@/lib/assets/activity";

const NOW = new Date("2026-07-23T12:00:00Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

describe("activityBucket", () => {
  it("buckets by how long ago the date is", () => {
    expect(activityBucket(daysAgo(1), NOW)).toBe("active");
    expect(activityBucket(daysAgo(30), NOW)).toBe("active");
    expect(activityBucket(daysAgo(45), NOW)).toBe("recent");
    expect(activityBucket(daysAgo(90), NOW)).toBe("recent");
    expect(activityBucket(daysAgo(120), NOW)).toBe("stale");
  });

  it("treats empty or unparseable values as unknown", () => {
    expect(activityBucket("", NOW)).toBe("unknown");
    expect(activityBucket(undefined, NOW)).toBe("unknown");
    expect(activityBucket("not a date", NOW)).toBe("unknown");
  });
});
