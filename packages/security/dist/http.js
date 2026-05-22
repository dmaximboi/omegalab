"use strict";
// ============================================
// HTTP SECURITY MODULE - 10 Security Functions
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.staticCacheHeaders = exports.noCacheHeaders = exports.sessionCookieOptions = exports.secureCookieOptions = exports.securityHeaders = void 0;
exports.generateCsp = generateCsp;
exports.getCorsHeaders = getCorsHeaders;
exports.isValidContentType = isValidContentType;
exports.isValidMethod = isValidMethod;
exports.extractBearerToken = extractBearerToken;
exports.generateNonce = generateNonce;
exports.isValidOrigin = isValidOrigin;
exports.sanitizeHeaders = sanitizeHeaders;
// 1. Security Headers
exports.securityHeaders = {
    "X-DNS-Prefetch-Control": "on",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-XSS-Protection": "1; mode=block",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
// 2. Content Security Policy
function generateCsp(nonce) {
    const policies = [
        "default-src 'self'",
        `script-src 'self'${nonce ? ` 'nonce-${nonce}'` : ""} 'unsafe-inline'`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.flutterwave.com https://*.upstash.io",
        "frame-ancestors 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "upgrade-insecure-requests",
    ];
    return policies.join("; ");
}
// 3. CORS Headers
function getCorsHeaders(origin, allowedOrigins) {
    const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes("*");
    if (!isAllowed)
        return {};
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
    };
}
// 4. Cookie Options (Secure)
exports.secureCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
};
// 5. Session Cookie Options
exports.sessionCookieOptions = {
    ...exports.secureCookieOptions,
    maxAge: 60 * 60 * 24, // 1 day
};
// 6. Cache Control Headers
exports.noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};
exports.staticCacheHeaders = {
    "Cache-Control": "public, max-age=31536000, immutable",
};
// 7. Validate Content Type
function isValidContentType(contentType, allowed) {
    if (!contentType)
        return false;
    const type = contentType.split(";")[0].trim().toLowerCase();
    return allowed.includes(type);
}
// 8. Validate Request Method
function isValidMethod(method, allowed) {
    return allowed.includes(method.toUpperCase());
}
// 9. Extract Bearer Token
function extractBearerToken(authHeader) {
    if (!authHeader?.startsWith("Bearer "))
        return null;
    return authHeader.slice(7);
}
// 10. Generate Nonce
function generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString("base64");
}
// 11. Validate Origin
function isValidOrigin(origin, allowedOrigins) {
    if (!origin)
        return false;
    return allowedOrigins.includes(origin);
}
// 12. Sanitize Headers
function sanitizeHeaders(headers) {
    const sanitized = {};
    const forbidden = ["cookie", "authorization", "x-api-key"];
    for (const [key, value] of Object.entries(headers)) {
        if (!forbidden.includes(key.toLowerCase())) {
            sanitized[key] = value.slice(0, 1000);
        }
    }
    return sanitized;
}
