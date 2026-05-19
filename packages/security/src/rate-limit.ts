// ============================================
// RATE LIMITING MODULE - 10 Security Functions
// ============================================
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create Redis client (lazy initialization)
let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    });
  }
  return redis;
}

// 1. Contact Form Rate Limiter (3 req/hour)
export const contactRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  prefix: "ratelimit:contact",
});

// 2. Auth Rate Limiter (10 req/15min)
export const authRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(10, "15 m"),
  prefix: "ratelimit:auth",
});

// 3. Order Rate Limiter (20 req/hour)
export const orderRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  prefix: "ratelimit:order",
});

// 4. General API Rate Limiter (100 req/min)
export const apiRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  prefix: "ratelimit:api",
});

// 5. Admin Rate Limiter (200 req/min)
export const adminRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(200, "1 m"),
  prefix: "ratelimit:admin",
});

// 6. Upload Rate Limiter (10 req/hour)
export const uploadRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "ratelimit:upload",
});

// 7. Password Reset Rate Limiter (3 req/hour)
export const passwordResetRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  prefix: "ratelimit:password-reset",
});

// 8. Webhook Rate Limiter (1000 req/min)
export const webhookRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(1000, "1 m"),
  prefix: "ratelimit:webhook",
});

// 9. Search Rate Limiter (30 req/min)
export const searchRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:search",
});

// 10. Check Rate Limit
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

// 11. Get Client IP
export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         headers.get("x-real-ip") ||
         "unknown";
}

// 12. Create Custom Rate Limiter
export function createRateLimiter(requests: number, window: string, prefix: string): Ratelimit {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(requests, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    prefix: `ratelimit:${prefix}`,
  });
}
