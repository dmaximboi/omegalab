"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRateLimit = exports.webhookRateLimit = exports.passwordResetRateLimit = exports.uploadRateLimit = exports.adminRateLimit = exports.apiRateLimit = exports.orderRateLimit = exports.authRateLimit = exports.contactRateLimit = void 0;
exports.checkRateLimit = checkRateLimit;
exports.getClientIp = getClientIp;
exports.createRateLimiter = createRateLimiter;
// ============================================
// RATE LIMITING MODULE - 10 Security Functions
// ============================================
const ratelimit_1 = require("@upstash/ratelimit");
const redis_1 = require("@upstash/redis");
// Create Redis client (lazy initialization)
let redis = null;
function getRedis() {
    if (!redis) {
        redis = new redis_1.Redis({
            url: process.env.UPSTASH_REDIS_REST_URL || "",
            token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
        });
    }
    return redis;
}
// 1. Contact Form Rate Limiter (3 req/hour)
exports.contactRateLimit = new ratelimit_1.Ratelimit({
    redis: getRedis(),
    limiter: ratelimit_1.Ratelimit.slidingWindow(3, "1 h"),
    prefix: "ratelimit:contact",
});
// 2. Auth Rate Limiter (10 req/15min)
exports.authRateLimit = new ratelimit_1.Ratelimit({
    redis: getRedis(),
    limiter: ratelimit_1.Ratelimit.slidingWindow(10, "15 m"),
    prefix: "ratelimit:auth",
});
// 3. Order Rate Limiter (20 req/hour)
exports.orderRateLimit = new ratelimit_1.Ratelimit({
    redis: getRedis(),
    limiter: ratelimit_1.Ratelimit.slidingWindow(20, "1 h"),
    prefix: "ratelimit:order",
});
// 4. General API Rate Limiter (100 req/min)
exports.apiRateLimit = new ratelimit_1.Ratelimit({
    redis: getRedis(),
    limiter: ratelimit_1.Ratelimit.slidingWindow(100, "1 m"),
    prefix: "ratelimit:api",
});
// 5. Admin Rate Limiter (200 req/min)
exports.adminRateLimit = new ratelimit_1.Ratelimit({
    redis: getRedis(),
    limiter: ratelimit_1.Ratelimit.slidingWindow(200, "1 m"),
    prefix: "ratelimit:admin",
});
// 6. Upload Rate Limiter (10 req/hour)
exports.uploadRateLimit = new ratelimit_1.Ratelimit({
    redis: getRedis(),
    limiter: ratelimit_1.Ratelimit.slidingWindow(10, "1 h"),
    prefix: "ratelimit:upload",
});
// 7. Password Reset Rate Limiter (3 req/hour)
exports.passwordResetRateLimit = new ratelimit_1.Ratelimit({
    redis: getRedis(),
    limiter: ratelimit_1.Ratelimit.slidingWindow(3, "1 h"),
    prefix: "ratelimit:password-reset",
});
// 8. Webhook Rate Limiter (1000 req/min)
exports.webhookRateLimit = new ratelimit_1.Ratelimit({
    redis: getRedis(),
    limiter: ratelimit_1.Ratelimit.slidingWindow(1000, "1 m"),
    prefix: "ratelimit:webhook",
});
// 9. Search Rate Limiter (30 req/min)
exports.searchRateLimit = new ratelimit_1.Ratelimit({
    redis: getRedis(),
    limiter: ratelimit_1.Ratelimit.slidingWindow(30, "1 m"),
    prefix: "ratelimit:search",
});
// 10. Check Rate Limit
async function checkRateLimit(limiter, identifier) {
    const result = await limiter.limit(identifier);
    return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
    };
}
// 11. Get Client IP
function getClientIp(headers) {
    return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headers.get("x-real-ip") ||
        "unknown";
}
// 12. Create Custom Rate Limiter
function createRateLimiter(requests, window, prefix) {
    return new ratelimit_1.Ratelimit({
        redis: getRedis(),
        limiter: ratelimit_1.Ratelimit.slidingWindow(requests, window),
        prefix: `ratelimit:${prefix}`,
    });
}
