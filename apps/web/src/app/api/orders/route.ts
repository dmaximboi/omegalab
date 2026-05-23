import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { generateTxRef, generateReceiptHash } from "@/lib/flutterwave";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Lazy Prisma client - only instantiated when first accessed
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

/**
 * Transaction State Machine — 5 steps:
 * 1. INITIATED  — Order created, awaiting payment gateway
 * 2. PROCESSING — Payment started (Flutterwave checkout opened)
 * 3. VERIFYING  — Server is verifying with Flutterwave API
 * 4. PAID       — Payment verified and confirmed
 * 5. FAILED     — Payment failed or verification failed
 *
 * Logged in PaymentLog with step field for auditability
 */

export async function POST(request: Request) {
  // Capture IP and User-Agent upfront
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || "unknown";

  try {
    const body = await request.json();
    const { items, name, email, phone, address } = body;
    // NOTE: we intentionally ignore frontend "total" — server computes it

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (items.length > 50) {
      return NextResponse.json({ error: "Too many items" }, { status: 400 });
    }

    if (!name || !email || !phone || !address) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Validate email format server-side
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Validate phone (basic)
    if (phone.length < 10 || phone.length > 15) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    // Extract product IDs and validate they exist + are active
    const productIds: string[] = items.map((item: any) => String(item.id));
    const uniqueIds = Array.from(new Set(productIds));

    const products = await getPrisma().product.findMany({
      where: {
        id: { in: uniqueIds },
        isActive: true,
      },
      select: { id: true, price: true, name: true },
    });

    if (products.length !== uniqueIds.length) {
      return NextResponse.json({ error: "Some products are unavailable" }, { status: 400 });
    }

    // Build a price lookup from DB — NEVER trust frontend prices
    // Using Decimal.js for precision (no floating point errors on money)
    const priceMap = new Map<string, Decimal>(products.map((p: typeof products[number]) => [p.id, new Decimal(p.price.toString())]));

    // Compute server-side total with Decimal.js
    let serverTotal = new Decimal(0);
    const orderItems: { productId: string; quantity: number; unitPrice: number }[] = [];

    for (const item of items) {
      const dbPrice = priceMap.get(String(item.id));
      const quantity = Math.floor(Number(item.quantity));

      if (!dbPrice || !quantity || quantity < 1 || quantity > 100) {
        return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
      }

      const lineTotal = dbPrice.times(quantity);
      serverTotal = serverTotal.plus(lineTotal);

      orderItems.push({
        productId: String(item.id),
        quantity,
        unitPrice: dbPrice.toNumber(),
      });
    }

    if (serverTotal.lte(0)) {
      return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
    }

    // Convert to number for DB (Prisma Decimal accepts number/string)
    const totalAsNumber = serverTotal.toDecimalPlaces(2).toNumber();

    // Generate cryptographically secure identifiers
    const txRef = generateTxRef();
    const paymentToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Idempotency: check if same user+items already has a PENDING order in last 5 min
    const recentOrder = await getPrisma().order.findFirst({
      where: {
        status: "INITIATED",
        ipAddress,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        totalAmount: totalAsNumber,
      },
    });

    if (recentOrder) {
      // Return the existing order instead of creating duplicate
      return NextResponse.json({
        orderId: recentOrder.id,
        txRef: recentOrder.txRef,
        paymentToken: (recentOrder as any).paymentToken,
        amount: totalAsNumber,
      });
    }

    // Create or find user
    const guestUser = await getPrisma().user.upsert({
      where: { email },
      create: {
        email,
        name: String(name).slice(0, 100),
        role: "customer",
      },
      update: {},
    });

    // Generate HMAC receipt hash with salt (orderId not available yet, use txRef as unique identifier)
    const { hash: receiptHash, salt: receiptSalt } = generateReceiptHash(txRef, txRef);
    // Note: txRef is unique per order and used as the orderId component since order hasn't been created yet

    // STEP 1: INITIATED — Create order in database
    const order = await getPrisma().order.create({
      data: {
        userId: guestUser.id,
        totalAmount: totalAsNumber,
        receiptHash,
        receiptSalt,
        txRef,
        status: "INITIATED",
        ipAddress,
        userAgent,
        ...(process.env.NODE_ENV === 'development' ? {} : {
          paymentToken,
          tokenExpiresAt,
        }),
        items: {
          create: orderItems,
        },
      },
    });

    // Log Step 1
    await logTransactionStep(order.id, txRef, "INITIATED", ipAddress, {
      itemCount: orderItems.length,
      total: totalAsNumber,
      userId: guestUser.id,
    });

    console.log("[ORDER] Step 1 INITIATED:", order.id, "txRef:", txRef, "amount:", totalAsNumber);

    return NextResponse.json({
      orderId: order.id,
      txRef,
      paymentToken: (order as any).paymentToken,
      amount: totalAsNumber,
      userEmail: guestUser.email,
      userName: guestUser.name,
    });
  } catch (error) {
    console.error("[ORDER] Create error:", error);
    return NextResponse.json({ error: "Could not create order. Please try again." }, { status: 500 });
  }
}

// Log each transaction step for admin visibility
async function logTransactionStep(
  orderId: string,
  txRef: string,
  step: string,
  ipAddress: string,
  metadata: Record<string, any>
) {
  try {
    await getPrisma().paymentLog.create({
      data: {
        orderId,
        txRef,
        status: `step:${step}`,
        ipAddress,
        responseData: JSON.stringify({ step, ...metadata, timestamp: new Date().toISOString() }),
      },
    });
  } catch (logErr) {
    console.error("[TX LOG] Failed:", logErr);
  }
}
