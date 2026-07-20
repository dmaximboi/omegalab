import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

export async function POST(request: NextRequest) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";

    // Cap spam without blocking the UX (always respond ok when limited)
    const rateCheck = await checkRateLimit(`consent:${ipAddress}`, 5, 60000, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    const { essential, analytics, marketing, version } = body;
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) || "unknown";

    await getPrisma().securityEvent.create({
      data: {
        eventType: "cookie_consent",
        severity: "info",
        ipAddress,
        description: `Cookie consent: essential=${Boolean(essential)}, analytics=${Boolean(analytics)}, marketing=${Boolean(marketing)}`,
        metadata: JSON.stringify({
          essential: Boolean(essential),
          analytics: Boolean(analytics),
          marketing: Boolean(marketing),
          version: typeof version === "string" ? version.slice(0, 32) : null,
          userAgent,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[CONSENT] Log error:", error);
    return NextResponse.json({ ok: true });
  }
}
