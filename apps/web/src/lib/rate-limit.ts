/**
 * Distributed Rate Limiting with Upstash Redis fallback to in-memory
 * 
 * In production with multiple server instances, in-memory rate limiting
 * doesn't work because each instance has its own memory. This utility
 * automatically uses Upstash Redis if configured, otherwise falls back
 * to in-memory for development.
 */

const inMemoryStore = new Map<string, { count: number; timestamp: number; blockedUntil?: number }>();

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetAt?: number;
}

export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
  blockDurationMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Use Redis if configured (production)
  if (redisUrl && redisToken) {
    return await checkRedisRateLimit(identifier, maxRequests, windowMs, blockDurationMs, now);
  }

  // Fallback to in-memory (development)
  return checkInMemoryRateLimit(identifier, maxRequests, windowMs, blockDurationMs, now);
}

// In-memory rate limiting (for development)
function checkInMemoryRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
  blockDurationMs: number,
  now: number
): RateLimitResult {
  const record = inMemoryStore.get(identifier);
  
  if (!record) {
    inMemoryStore.set(identifier, { count: 1, timestamp: now });
    return { allowed: true, remainingAttempts: maxRequests - 1 };
  }
  
  // Check if blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    return { allowed: false, remainingAttempts: 0, resetAt: record.blockedUntil };
  }
  
  // Reset if outside window
  if (now - record.timestamp > windowMs) {
    inMemoryStore.set(identifier, { count: 1, timestamp: now });
    return { allowed: true, remainingAttempts: maxRequests - 1 };
  }
  
  // Increment count
  record.count++;
  record.timestamp = now;
  
  if (record.count > maxRequests) {
    record.blockedUntil = now + blockDurationMs;
    console.warn(`[RATE_LIMIT] ${identifier} blocked for rate limit`);
    return { allowed: false, remainingAttempts: 0, resetAt: record.blockedUntil };
  }
  
  return { allowed: true, remainingAttempts: maxRequests - record.count };
}

// Redis-based rate limiting (for production)
async function checkRedisRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
  blockDurationMs: number,
  now: number
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL!;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN!;
  
  const key = `ratelimit:${identifier}`;
  
  try {
    // Use INCR to atomically increment counter
    const incrUrl = `${redisUrl}/incr/${key}`;
    const incrResponse = await fetch(incrUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
    });
    
    if (!incrResponse.ok) {
      console.error("[RATE_LIMIT] Redis INCR failed, falling back to in-memory");
      return checkInMemoryRateLimit(identifier, maxRequests, windowMs, blockDurationMs, now);
    }
    
    const incrData = await incrResponse.json();
    const count = incrData.result || 0;
    
    // Set expiry on first request in window
    if (count === 1) {
      const expireUrl = `${redisUrl}/pexpire/${key}`;
      await fetch(expireUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
        },
        body: windowMs.toString(),
      });
    }
    
    // Check if over limit
    if (count > maxRequests) {
      // Check if already blocked
      const blockKey = `ratelimit:block:${identifier}`;
      const blockUrl = `${redisUrl}/get/${blockKey}`;
      const blockResponse = await fetch(blockUrl, {
        headers: {
          Authorization: `Bearer ${redisToken}`,
        },
      });
      
      const blockData = await blockResponse.json();
      if (blockData.result) {
        const blockedUntil = parseInt(blockData.result);
        if (now < blockedUntil) {
          return { allowed: false, remainingAttempts: 0, resetAt: blockedUntil };
        }
      }
      
      // Set block
      const blockedUntil = now + blockDurationMs;
      const setBlockUrl = `${redisUrl}/set/${blockKey}`;
      await fetch(setBlockUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
        },
        body: blockedUntil.toString(),
      });
      
      const setBlockExpireUrl = `${redisUrl}/pexpire/${blockKey}`;
      await fetch(setBlockExpireUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
        },
        body: blockDurationMs.toString(),
      });
      
      return { allowed: false, remainingAttempts: 0, resetAt: blockedUntil };
    }
    
    return { allowed: true, remainingAttempts: maxRequests - count };
  } catch (error) {
    console.error("[RATE_LIMIT] Redis error, falling back to in-memory:", error);
    return checkInMemoryRateLimit(identifier, maxRequests, windowMs, blockDurationMs, now);
  }
}

// Clear rate limit for a specific identifier (useful for testing)
export function clearRateLimit(identifier: string): void {
  inMemoryStore.delete(identifier);
}
