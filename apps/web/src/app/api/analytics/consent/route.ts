import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { essential, analytics, marketing, version } = body;

    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) || "unknown";

    // Log cookie consent for GDPR/NDPR compliance
    await prisma.securityEvent.create({
      data: {
        eventType: "cookie_consent",
        severity: "info",
        ipAddress,
        description: `Cookie consent: essential=${essential}, analytics=${analytics}, marketing=${marketing}`,
        metadata: JSON.stringify({
          essential,
          analytics,
          marketing,
          version,
          userAgent,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[CONSENT] Log error:", error);
    // Always return 200 — consent logging should never block the user
    return NextResponse.json({ ok: true });
  }
}
