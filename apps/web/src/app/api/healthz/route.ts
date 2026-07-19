import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Simple test endpoint - always works to verify route exists
export async function HEAD() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}

// Lazy Prisma client - only instantiated when first accessed
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error("[HEALTH] CRITICAL: DATABASE_URL environment variable is not set!");
    }
    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

/**
 * HEALTH CHECK ENDPOINT
 * 
 * Purpose:
 * 1. Keep database connection alive (prevents Neon cold starts)
 * 2. Monitor application health
 * 3. Used by uptime monitoring services
 * 
 * Security:
 * - Read-only operation
 * - No sensitive data exposed
 * - Rate limited by middleware
 */

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Simple database ping to keep connection alive
    await getPrisma().$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
        responseTime: `${responseTime}ms`,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error("[HEALTH] Database check failed:", error);
    
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: "Database connection failed",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

// Block other methods
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
