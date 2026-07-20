import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Security middleware
 * - Never permanently ban an IP after normal rate limits (that caused whole-site 403)
 * - Unauthorized /admin access returns 404 (do not reveal admin exists)
 */

const PROTECTED_ROUTES = ["/admin"];
const PROTECTED_API_ROUTES = ["/api/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // ============================================
  // SECURITY HEADERS
  // ============================================
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=()"
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://checkout.flutterwave.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://*.uploadthing.com https://*.neon.tech https://api.ravepay.co https://*.flutterwave.com https://*.myflutterwave.com https://checkout.flutterwave.com https://checkout-v3-ui-prod.f4b-flutterwave.com https://api-js.mixpanel.com",
      "frame-src 'self' https://accounts.google.com https://checkout.flutterwave.com https://checkout-v3.flutterwave.com https://checkout-v3-ui-prod.f4b-flutterwave.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join("; ")
  );

  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Download-Options", "noopen");

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  // ============================================
  // RATE LIMITING — temporary 429 only (never site-wide permanent ban)
  // ============================================
  if (pathname.startsWith("/api/")) {
    const maxRequests = pathname.includes("/auth/") ? 5 : 60;
    const windowMs = 60000;
    const blockDuration = 2 * 60 * 1000; // 2 minutes soft block on that key only

    const rateCheck = await checkRateLimit(
      `${ip}:${pathname}`,
      maxRequests,
      windowMs,
      blockDuration
    );

    if (!rateCheck.allowed) {
      console.warn(`[SECURITY] Rate limited: ${ip} ${pathname}`);
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": rateCheck.resetAt
              ? String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000))
              : "120",
          },
        }
      );
    }
  }

  // ============================================
  // ADMIN PROTECTION — unauthenticated / non-admin → 404 (hide existence)
  // ============================================
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isProtectedAPI = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute || isProtectedAPI) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const hideAdmin = () => {
      if (isProtectedAPI) {
        return new NextResponse(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Empty 404 — looks like a missing page, not "forbidden"
      return new NextResponse(null, { status: 404 });
    };

    if (!token) {
      return hideAdmin();
    }

    if (
      (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
      token.isAdmin !== true
    ) {
      return hideAdmin();
    }
  }

  // ============================================
  // Block scanners by User-Agent (not by IP string)
  // ============================================
  const userAgent = request.headers.get("user-agent") || "";
  const scannerUa = [
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

  for (const pattern of scannerUa) {
    if (pattern.test(userAgent)) {
      console.warn(`[SECURITY] Blocked scanner UA`);
      return new NextResponse(null, { status: 404 });
    }
  }

  if (pathname.includes("..") || pathname.includes("//")) {
    return new NextResponse(null, { status: 400 });
  }

  const blockedPaths = [
    "/wp-admin",
    "/wp-login",
    "/wp-content",
    "/xmlrpc.php",
    "/.env",
    "/.git",
    "/config.php",
    "/phpmyadmin",
    "/admin.php",
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
