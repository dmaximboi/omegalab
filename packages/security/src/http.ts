// ============================================
// HTTP SECURITY MODULE - 10 Security Functions
// ============================================

// 1. Security Headers
export const securityHeaders = {
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-XSS-Protection": "1; mode=block",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// 2. Content Security Policy
export function generateCsp(nonce?: string): string {
  const policies = [
    "default-src 'self'",
    `script-src 'self'${nonce ? ` 'nonce-${nonce}'` : ""} 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.bachs.io https://sandbox-api.bachs.io https://*.upstash.io",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ];
  return policies.join("; ");
}

// 3. CORS Headers
export function getCorsHeaders(origin: string, allowedOrigins: string[]): Record<string, string> {
  const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes("*");
  if (!isAllowed) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

// 4. Cookie Options (Secure)
export const secureCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

// 5. Session Cookie Options
export const sessionCookieOptions = {
  ...secureCookieOptions,
  maxAge: 60 * 60 * 24, // 1 day
};

// 6. Cache Control Headers
export const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

export const staticCacheHeaders = {
  "Cache-Control": "public, max-age=31536000, immutable",
};

// 7. Validate Content Type
export function isValidContentType(contentType: string | null, allowed: string[]): boolean {
  if (!contentType) return false;
  const type = contentType.split(";")[0].trim().toLowerCase();
  return allowed.includes(type);
}

// 8. Validate Request Method
export function isValidMethod(method: string, allowed: string[]): boolean {
  return allowed.includes(method.toUpperCase());
}

// 9. Extract Bearer Token
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

// 10. Generate Nonce
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

// 11. Validate Origin
export function isValidOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

// 12. Sanitize Headers
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const forbidden = ["cookie", "authorization", "x-api-key"];
  for (const [key, value] of Object.entries(headers)) {
    if (!forbidden.includes(key.toLowerCase())) {
      sanitized[key] = value.slice(0, 1000);
    }
  }
  return sanitized;
}
