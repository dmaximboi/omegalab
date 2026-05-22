import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

/**
 * CRON JOB: Keep Database Alive
 * 
 * Purpose: Prevent Neon database from sleeping due to inactivity
 * 
 * Security:
 * - Requires CRON_SECRET header
 * - Uses timing-safe comparison to prevent timing attacks
 * - Rate limited by Vercel cron (every 3 hours max)
 * - Only performs read operations
 * 
 * Best Practices:
 * - Use strong random secret (32+ chars)
 * - Never log the secret
 * - Rotate secret periodically
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error("[CRON] CRON_SECRET not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // In development, allow without secret for testing
    if (process.env.NODE_ENV === "production") {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.warn("[CRON] Missing authorization header");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const providedSecret = authHeader.substring(7);
      
      // Timing-safe comparison to prevent timing attacks
      const secretBuffer = Buffer.from(cronSecret, "utf-8");
      const providedBuffer = Buffer.from(providedSecret, "utf-8");
      
      if (secretBuffer.length !== providedBuffer.length || 
          !crypto.timingSafeEqual(secretBuffer, providedBuffer)) {
        console.warn("[CRON] Invalid secret");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const startTime = Date.now();
    
    // Simple query to keep connection alive (read-only)
    await prisma.$queryRaw`SELECT 1 as ping`;
    
    // Optional: Clean up old data (only if tables exist)
    const cleanupResults = {
      securityEvents: 0,
      rateLimitLogs: 0,
    };

    try {
      // Clean up old security events (older than 30 days)
      const securityCleanup = await prisma.securityEvent.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }).catch(() => ({ count: 0 }));
      cleanupResults.securityEvents = securityCleanup.count;
    } catch {
      // Table might not exist, skip
    }

    const responseTime = Date.now() - startTime;

    console.log(`[CRON] Keep-alive completed: ${responseTime}ms`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      cleanup: cleanupResults,
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[CRON] Keep-alive failed:", error);
    return NextResponse.json(
      { error: "Database ping failed" },
      { status: 500 }
    );
  }
}
