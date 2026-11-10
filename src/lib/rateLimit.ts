// Repo path: src/lib/rateLimit.ts
//
// Small rate-limit helper for the auth routes.
//
// - If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set (Vercel
//   env vars), limits are enforced through Upstash Redis and are shared
//   across all serverless instances. This is the real protection.
// - If they are NOT set, it falls back to an in-memory counter. On Vercel each
//   serverless instance has its own memory, so the fallback only slows down
//   an attacker hitting one warm instance; it is not a hard guarantee.
//
// It never throws: if Upstash is unreachable it falls back to memory rather
// than blocking real users from signing in.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitRule {
  /** Namespace so different routes don't share counters, e.g. "login:ip". */
  prefix: string;
  /** Max requests allowed inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;
const limiters = new Map<string, Ratelimit>();

function getUpstashLimiter(rule: RateLimitRule): Ratelimit | null {
  if (!redis) return null;
  const cacheKey = `${rule.prefix}:${rule.limit}:${rule.windowSec}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSec} s`),
      prefix: `tn:${rule.prefix}`,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// ── In-memory fallback ───────────────────────────────────────────────────────

const memory = new Map<string, number[]>();
let lastSweep = Date.now();

function memoryCheck(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const windowMs = rule.windowSec * 1000;

  // Sweep stale keys occasionally so the Map can't grow forever.
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    memory.forEach((hits, k) => {
      if (hits.length === 0 || now - hits[hits.length - 1] > windowMs * 2) {
        memory.delete(k);
      }
    });
  }

  const fullKey = `${rule.prefix}:${key}`;
  const hits = (memory.get(fullKey) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= rule.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    memory.set(fullKey, hits);
    return { ok: false, retryAfterSec };
  }

  hits.push(now);
  memory.set(fullKey, hits);
  return { ok: true, retryAfterSec: 0 };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function checkRateLimit(
  key: string,
  rule: RateLimitRule
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(rule);
  if (limiter) {
    try {
      const res = await limiter.limit(key);
      return {
        ok: res.success,
        retryAfterSec: res.success
          ? 0
          : Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)),
      };
    } catch {
      // Upstash unreachable — fall through to the in-memory counter.
    }
  }
  return memoryCheck(key, rule);
}

/** Best-effort client IP from the proxy headers Vercel sets. */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** Standard 429 response with a Retry-After header. */
export function tooManyRequests(retryAfterSec: number) {
  const mins = Math.ceil(retryAfterSec / 60);
  const wait = retryAfterSec < 90 ? `${retryAfterSec} seconds` : `${mins} minutes`;
  return Response.json(
    { error: `Too many attempts. Please try again in ${wait}.` },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
  );
}
