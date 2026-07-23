/**
 * Small in-memory sliding-window rate limiter. It is a first line of defence
 * against brute-force / abuse on unauthenticated endpoints (login, password
 * reset). State is per-process, so on a multi-instance deployment each machine
 * keeps its own counters — still a meaningful hurdle, but not a substitute for
 * an edge/WAF limit. No external dependency, fully testable via an injectable
 * clock.
 */

export interface RateLimitOptions {
  /** Maximum number of hits allowed within the window. */
  limit: number;
  /** Sliding window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining hits before the limit is reached (0 when blocked). */
  remaining: number;
  /** Milliseconds until the caller may retry (0 when allowed). */
  retryAfterMs: number;
}

/** A single limiter instance keyed by an arbitrary string (e.g. ip+email). */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly options: RateLimitOptions,
    private readonly now: () => number = Date.now,
  ) {}

  /** Record a hit for `key` and report whether it is allowed. */
  check(key: string): RateLimitResult {
    const t = this.now();
    const windowStart = t - this.options.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((ts) => ts > windowStart);

    if (recent.length >= this.options.limit) {
      const oldest = recent[0];
      this.hits.set(key, recent);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(0, oldest + this.options.windowMs - t),
      };
    }

    recent.push(t);
    this.hits.set(key, recent);
    return {
      allowed: true,
      remaining: this.options.limit - recent.length,
      retryAfterMs: 0,
    };
  }

  /** Clear recorded hits for a key (e.g. after a successful login). */
  reset(key: string): void {
    this.hits.delete(key);
  }

  /** Drop windows that are fully expired to keep the map from growing. */
  prune(): void {
    const cutoff = this.now() - this.options.windowMs;
    for (const [key, timestamps] of this.hits) {
      const recent = timestamps.filter((ts) => ts > cutoff);
      if (recent.length === 0) this.hits.delete(key);
      else this.hits.set(key, recent);
    }
  }
}

/** Shared limiter for login attempts: 10 tries per 15 minutes per key. */
export const loginRateLimiter = new RateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });

/** Shared limiter for password-reset requests: 5 per hour per key. */
export const passwordResetRateLimiter = new RateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

/** Human-friendly rounding of a retry delay to whole minutes/seconds. */
export function formatRetryAfter(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
