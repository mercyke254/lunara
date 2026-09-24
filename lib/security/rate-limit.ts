import { prisma } from "@/lib/db/prisma";

/**
 * Rate limiting.
 *
 * Implemented with persistent fixed-window counters (`RateLimitBucket`) rather
 * than in-memory state, because a serverless/edge deployment has no shared
 * memory: an in-process Map would give each instance its own budget and let an
 * attacker multiply the effective limit by the instance count.
 *
 * The `key` is namespaced by the caller, e.g.
 *   rl:login:ip:<ipHash>
 *   rl:login:account:<userId>
 *   rl:recover:session:<recoverySessionId>
 */

export interface RateLimitOptions {
  key: string;
  /** Maximum attempts allowed inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
  /** Seconds until the window resets - suitable for a Retry-After header. */
  retryAfterSeconds: number;
}

/**
 * Consume one attempt against a key.
 *
 * Fails *closed*: if the datastore is unreachable we cannot prove the caller is
 * within budget, so we deny. These limits guard credential endpoints, and in
 * that situation the database being down means authentication cannot succeed
 * anyway.
 */
export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = options;
  const now = new Date();
  const windowMs = windowSeconds * 1000;

  try {
    const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });

    // Fresh window: create the bucket or reset an expired one.
    if (!existing || existing.expiresAt.getTime() <= now.getTime()) {
      const expiresAt = new Date(now.getTime() + windowMs);
      const bucket = await prisma.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now, expiresAt },
        update: { count: 1, windowStart: now, expiresAt },
      });
      return {
        ok: bucket.count <= limit,
        remaining: Math.max(0, limit - bucket.count),
        limit,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((bucket.expiresAt.getTime() - now.getTime()) / 1000),
        ),
      };
    }

    // Inside the current window: increment atomically and read the new total.
    const bucket = await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.expiresAt.getTime() - now.getTime()) / 1000),
    );

    return {
      ok: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      limit,
      retryAfterSeconds,
    };
  } catch (error) {
    console.error(
      "[lunara:rate-limit] datastore unavailable, denying request",
      error instanceof Error ? error.message : "unknown error",
    );
    return { ok: false, remaining: 0, limit, retryAfterSeconds: windowSeconds };
  }
}

/** Forget a key's budget - called after a successful authentication. */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await prisma.rateLimitBucket.deleteMany({ where: { key } });
  } catch {
    // Non-fatal.
  }
}

/**
 * Delete expired buckets. Called opportunistically from auth flows so the table
 * cannot grow without bound; no scheduler required.
 */
export async function pruneExpiredRateLimits(): Promise<void> {
  try {
    await prisma.rateLimitBucket.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
    });
  } catch {
    // Non-fatal.
  }
}

/** Namespaced key builders, so limits can never collide across endpoints. */
export const rateLimitKeys = {
  loginByIp: (ipHash: string | null) => `rl:login:ip:${ipHash ?? "unknown"}`,
  loginByAccount: (userId: string) => `rl:login:account:${userId}`,
  registerByIp: (ipHash: string | null) => `rl:register:ip:${ipHash ?? "unknown"}`,
  recoveryRequestByIp: (ipHash: string | null) =>
    `rl:recover:req:ip:${ipHash ?? "unknown"}`,
  recoveryRequestByAccount: (userId: string) => `rl:recover:req:account:${userId}`,
  recoveryVerifyBySession: (sessionId: string) =>
    `rl:recover:verify:${sessionId}`,
  passwordResetByIp: (ipHash: string | null) => `rl:reset:ip:${ipHash ?? "unknown"}`,
  changePasswordByUser: (userId: string) => `rl:password:change:${userId}`,
  accountDeleteByUser: (userId: string) => `rl:account:delete:${userId}`,
} as const;

// Window/limit policy, centralised so it is auditable in one place.
export const RATE_LIMITS = {
  /** 10 sign-in attempts per IP per 15 minutes. */
  loginByIp: { limit: 10, windowSeconds: 15 * 60 },
  /** 8 attempts per account per 15 minutes. */
  loginByAccount: { limit: 8, windowSeconds: 15 * 60 },
  /** 5 registrations per IP per hour. */
  registerByIp: { limit: 5, windowSeconds: 60 * 60 },
  /** 5 recovery requests per IP per hour. */
  recoveryRequestByIp: { limit: 5, windowSeconds: 60 * 60 },
  /** 3 recovery requests per account per hour. */
  recoveryRequestByAccount: { limit: 3, windowSeconds: 60 * 60 },
  /** 5 verification submissions per recovery session in total. */
  recoveryVerifyBySession: { limit: 5, windowSeconds: 60 * 60 },
  /** 5 completed resets per IP per hour. */
  passwordResetByIp: { limit: 5, windowSeconds: 60 * 60 },
  /** 5 password changes per account per hour. */
  changePasswordByUser: { limit: 5, windowSeconds: 60 * 60 },
  /** 3 deletion attempts per account per hour. */
  accountDeleteByUser: { limit: 3, windowSeconds: 60 * 60 },
} as const;
