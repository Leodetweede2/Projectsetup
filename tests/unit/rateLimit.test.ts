import { describe, it, expect } from "vitest";
import { RateLimiter, formatRetryAfter } from "@/lib/rate-limit";

describe("RateLimiter", () => {
  it("allows hits up to the limit then blocks", () => {
    let now = 1_000;
    const rl = new RateLimiter({ limit: 3, windowMs: 1000 }, () => now);

    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(true);
    const third = rl.check("a");
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const blocked = rl.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    let now = 0;
    const rl = new RateLimiter({ limit: 1, windowMs: 1000 }, () => now);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
  });

  it("frees capacity once the window slides past old hits", () => {
    let now = 0;
    const rl = new RateLimiter({ limit: 2, windowMs: 1000 }, () => now);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);

    now = 1001; // both prior hits are now outside the window
    expect(rl.check("a").allowed).toBe(true);
  });

  it("reset() clears a key immediately", () => {
    let now = 0;
    const rl = new RateLimiter({ limit: 1, windowMs: 1000 }, () => now);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
    rl.reset("a");
    expect(rl.check("a").allowed).toBe(true);
  });

  it("prune() drops fully expired keys", () => {
    let now = 0;
    const rl = new RateLimiter({ limit: 1, windowMs: 1000 }, () => now);
    rl.check("a");
    now = 2000;
    rl.prune();
    // After pruning the key is gone, so a fresh hit is allowed.
    expect(rl.check("a").allowed).toBe(true);
  });
});

describe("formatRetryAfter", () => {
  it("formats sub-minute delays in seconds", () => {
    expect(formatRetryAfter(1)).toBe("1 second");
    expect(formatRetryAfter(2000)).toBe("2 seconds");
  });

  it("formats longer delays in minutes", () => {
    expect(formatRetryAfter(60_000)).toBe("1 minute");
    expect(formatRetryAfter(90_000)).toBe("2 minutes");
  });
});
