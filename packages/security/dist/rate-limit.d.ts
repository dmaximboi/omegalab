import { Ratelimit } from "@upstash/ratelimit";
export declare const contactRateLimit: Ratelimit;
export declare const authRateLimit: Ratelimit;
export declare const orderRateLimit: Ratelimit;
export declare const apiRateLimit: Ratelimit;
export declare const adminRateLimit: Ratelimit;
export declare const uploadRateLimit: Ratelimit;
export declare const passwordResetRateLimit: Ratelimit;
export declare const webhookRateLimit: Ratelimit;
export declare const searchRateLimit: Ratelimit;
export declare function checkRateLimit(limiter: Ratelimit, identifier: string): Promise<{
    success: boolean;
    remaining: number;
    reset: number;
}>;
export declare function getClientIp(headers: Headers): string;
export declare function createRateLimiter(requests: number, window: string, prefix: string): Ratelimit;
