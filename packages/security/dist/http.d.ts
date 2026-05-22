export declare const securityHeaders: {
    "X-DNS-Prefetch-Control": string;
    "Strict-Transport-Security": string;
    "X-XSS-Protection": string;
    "X-Frame-Options": string;
    "X-Content-Type-Options": string;
    "Referrer-Policy": string;
    "Permissions-Policy": string;
};
export declare function generateCsp(nonce?: string): string;
export declare function getCorsHeaders(origin: string, allowedOrigins: string[]): Record<string, string>;
export declare const secureCookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
};
export declare const sessionCookieOptions: {
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
};
export declare const noCacheHeaders: {
    "Cache-Control": string;
    Pragma: string;
    Expires: string;
};
export declare const staticCacheHeaders: {
    "Cache-Control": string;
};
export declare function isValidContentType(contentType: string | null, allowed: string[]): boolean;
export declare function isValidMethod(method: string, allowed: string[]): boolean;
export declare function extractBearerToken(authHeader: string | null): string | null;
export declare function generateNonce(): string;
export declare function isValidOrigin(origin: string | null, allowedOrigins: string[]): boolean;
export declare function sanitizeHeaders(headers: Record<string, string>): Record<string, string>;
