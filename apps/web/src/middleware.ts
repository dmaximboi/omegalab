import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * ============================================
 * SECURITY MIDDLEWARE
 * ============================================
 * 
 * Runs on EVERY request to protect the application.
 * 
 * Security layers:
 * 1. Security headers (HSTS, CSP, X-Frame-Options, etc.)
 * 2. Rate limiting
 * 3. Authentication verification
 * 4. Admin role verification (from database via JWT)
 * 5. Suspicious request blocking
 * 6. Path traversal prevention
 */

// Routes that require authentication
const PROTECTED_ROUTES = ["/admin"];

// API routes that require authentication
const PROTECTED_API_ROUTES = ["/api/admin"];

// Rate limit tracking (in production, use Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ============================================
  // SECURITY HEADERS (Applied to ALL responses)
  // ============================================
  
  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");
  
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  
  // XSS protection (legacy browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");
  
  // Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Disable dangerous browser features
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  
  // HTTPS enforcement (HSTS) - only in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  
  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://checkout.flutterwave.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://*.uploadthing.com https://*.neon.tech",
      "frame-src 'self' https://accounts.google.com https://checkout.flutterwave.com https://checkout-v3-ui-prod.f4b-flutterwave.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join("; ")
  );
  
  // Prevent DNS prefetching
  response.headers.set("X-DNS-Prefetch-Control", "off");
  
  // Prevent IE from executing downloads in site's context
  response.headers.set("X-Download-Options", "noopen");
  
  // Disable client-side caching for sensitive routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  // ============================================
  // RATE LIMITING FOR API ROUTES
  // ============================================
  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";
    
    const key = `${ip}:${pathname}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = pathname.includes("/auth/") ? 10 : 30; // Stricter for auth

    const record = rateLimitMap.get(key);
    
    if (record && now - record.timestamp < windowMs) {
      if (record.count >= maxRequests) {
        return new NextResponse(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          { 
            status: 429, 
            headers: { 
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((record.timestamp + windowMs - now) / 1000)),
            } 
          }
        );
      }
      record.count++;
    } else {
      rateLimitMap.set(key, { count: 1, timestamp: now });
    }

    // Clean up old entries periodically
    if (rateLimitMap.size > 10000) {
      const cutoff = now - windowMs;
      const keysToDelete: string[] = [];
      rateLimitMap.forEach((v, k) => {
        if (v.timestamp < cutoff) keysToDelete.push(k);
      });
      keysToDelete.forEach(k => rateLimitMap.delete(k));
    }
  }

  // ============================================
  // PROTECTED ROUTES - Require Authentication
  // ============================================
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isProtectedAPI = PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));

  if (isProtectedRoute || isProtectedAPI) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // No token = not authenticated
    if (!token) {
      if (isProtectedAPI) {
        return new NextResponse(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      // For pages, return 404 (don't reveal admin exists)
      return new NextResponse(null, { status: 404 });
    }

    // Check admin access for admin routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      if (token.isAdmin !== true) {
        if (isProtectedAPI) {
          return new NextResponse(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
        // Return 404 for non-admins (don't reveal admin exists)
        return new NextResponse(null, { status: 404 });
      }
    }
  }

  // ============================================
  // BLOCK SUSPICIOUS REQUESTS
  // ============================================
  const userAgent = request.headers.get("user-agent") || "";
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zgrab/i,
    /gobuster/i,
    /dirbuster/i,
    /wpscan/i,
    /nuclei/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent)) {
      console.warn(`[SECURITY] Blocked suspicious user-agent: ${userAgent}`);
      return new NextResponse(null, { status: 403 });
    }
  }

  // Block path traversal attempts
  if (pathname.includes("..") || pathname.includes("//")) {
    console.warn(`[SECURITY] Blocked path traversal attempt: ${pathname}`);
    return new NextResponse(null, { status: 400 });
  }

  // Block common attack paths
  const blockedPaths = [
    "/wp-admin",
    "/wp-login",
    "/wp-content",
    "/xmlrpc.php",
    "/.env",
    "/.git",
    "/config",
    "/backup",
    "/phpmyadmin",
    "/admin.php",
    "/shell",
    "/cmd",
    "/eval",
  ];

  for (const blocked of blockedPaths) {
    if (pathname.toLowerCase().includes(blocked)) {
      return new NextResponse(null, { status: 404 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
