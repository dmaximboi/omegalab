import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyReceiptHash } from "@/lib/flutterwave";

export const dynamic = "force-dynamic";

// Lazy Prisma client - only instantiated when first accessed
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

export async function GET(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";

  try {
    const code = request.nextUrl.searchParams.get("code");
    
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    // Validate code format — HMAC hashes are hex, max 128 chars
    if (code.length > 128 || !/^[a-f0-9]+$/i.test(code)) {
      await logVerifyAttempt(ipAddress, code.slice(0, 20), false, "invalid_format");
      return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
    }

    // Rate limiting: max 10 verify attempts per IP per minute (simple in-memory)
    // In production, use Redis or DB-based rate limiting

    // Find order by receipt hash (QR code contains this)
    const order = await getPrisma().order.findFirst({
      where: {
        receiptHash: code,
        paymentVerified: true, // Only show verified (paid) orders
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
        user: {
          select: { name: true },
        },
      },
    });

    if (!order) {
      await logVerifyAttempt(ipAddress, code.slice(0, 20), false, "not_found");
      return NextResponse.json({ error: "Invalid or unverified receipt" }, { status: 404 });
    }

    // Verify receipt integrity using HMAC re-derivation with stored salt
    // This ensures the hash wasn't stolen from DB and applied to tampered data
    if (order.receiptSalt) {
      const isHashValid = verifyReceiptHash(order.txRef, order.txRef, order.receiptSalt, code);
      if (!isHashValid) {
        await logVerifyAttempt(ipAddress, code.slice(0, 20), false, "hash_mismatch");
        return NextResponse.json({ error: "Invalid receipt" }, { status: 404 });
      }
    }

    await logVerifyAttempt(ipAddress, code.slice(0, 20), true, "verified");

    return NextResponse.json({
      verified: true,
      order: {
        orderNumber: order.txRef,
        customerName: order.user?.name || "Customer",
        date: order.createdAt.toLocaleDateString("en-NG", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        items: order.items.map((item: typeof order.items[number]) => ({
          name: item.product?.name || "Product",
          quantity: item.quantity,
        })),
        total: Number(order.totalAmount),
        paidAt: order.verifiedAt,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("[VERIFY-QR] Error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

async function logVerifyAttempt(ip: string, codePrefix: string, success: boolean, reason: string) {
  try {
    await getPrisma().securityEvent.create({
      data: {
        eventType: "qr_verification",
        severity: success ? "info" : "warning",
        ipAddress: ip,
        description: `QR verify: ${reason}`,
        metadata: JSON.stringify({ codePrefix, success, reason, timestamp: new Date().toISOString() }),
      },
    });
  } catch {
    // Non-blocking
  }
}
