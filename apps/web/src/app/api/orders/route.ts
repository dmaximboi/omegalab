import { NextResponse } from "next/server";
import { PrismaClient, OrderStatus, Role } from "@prisma/client";
import Decimal from "decimal.js";
import { generateTxRef, generateReceiptHash } from "@/lib/flutterwave";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Guest or signed-in checkout.
 * - Signed-in: use session user
 * - Guest: require name, phone, address, email → upsert USER by email
 */
export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || "unknown";

  try {
    const rate = await checkRateLimit(`orders:${ipAddress}`, 10, 60000, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many order attempts. Please try again later." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { items, name, phone, address, email: bodyEmail } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (items.length > 50) {
      return NextResponse.json({ error: "Too many items" }, { status: 400 });
    }

    if (!name || !phone || !address) {
      return NextResponse.json({ error: "Name, phone, and address are required" }, { status: 400 });
    }

    const phoneClean = String(phone).replace(/\s+/g, "");
    if (phoneClean.length < 10 || phoneClean.length > 15) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const prisma = getPrisma();
    let orderUser: { id: string; email: string; name: string | null };

    if (session?.user?.id && session?.user?.email) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, email: true, name: true },
      });
      if (!sessionUser) {
        return NextResponse.json({ error: "User not found" }, { status: 401 });
      }
      // Keep profile name fresh from checkout form when provided
      if (name && name !== sessionUser.name) {
        await prisma.user
          .update({ where: { id: sessionUser.id }, data: { name: String(name).slice(0, 120) } })
          .catch(() => {});
      }
      orderUser = { ...sessionUser, name: String(name).slice(0, 120) || sessionUser.name };
    } else {
      // Guest checkout — email required
      const email = String(bodyEmail || "")
        .trim()
        .toLowerCase()
        .slice(0, 190);
      if (!email || !EMAIL_RE.test(email)) {
        return NextResponse.json(
          { error: "A valid email is required to place an order" },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, role: true },
      });

      if (existing) {
        // Never elevate; guests cannot attach to admin accounts via email spoof
        if (existing.role === Role.ADMIN) {
          return NextResponse.json(
            { error: "Please sign in to place an order with this email" },
            { status: 401 }
          );
        }
        await prisma.user
          .update({
            where: { id: existing.id },
            data: { name: String(name).slice(0, 120) },
          })
          .catch(() => {});
        orderUser = {
          id: existing.id,
          email: existing.email,
          name: String(name).slice(0, 120),
        };
      } else {
        orderUser = await prisma.user.create({
          data: {
            email,
            name: String(name).slice(0, 120),
            role: Role.USER,
          },
          select: { id: true, email: true, name: true },
        });
      }
    }

    const productIds: string[] = items.map((item: { id: unknown }) => String(item.id));
    const uniqueIds = Array.from(new Set(productIds));

    const products = await prisma.product.findMany({
      where: {
        id: { in: uniqueIds },
        isActive: true,
      },
      select: { id: true, price: true, name: true },
    });

    if (products.length !== uniqueIds.length) {
      return NextResponse.json({ error: "Some products are unavailable" }, { status: 400 });
    }

    const priceMap = new Map<string, Decimal>(
      products.map((p) => [p.id, new Decimal(p.price.toString())])
    );

    let serverTotal = new Decimal(0);
    const orderItems: { productId: string; quantity: number; unitPrice: number }[] = [];

    for (const item of items) {
      const dbPrice = priceMap.get(String(item.id));
      const quantity = Math.floor(Number(item.quantity));

      if (!dbPrice || !quantity || quantity < 1 || quantity > 100) {
        return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
      }

      serverTotal = serverTotal.plus(dbPrice.times(quantity));
      orderItems.push({
        productId: String(item.id),
        quantity,
        unitPrice: dbPrice.toNumber(),
      });
    }

    if (serverTotal.lte(0)) {
      return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
    }

    const totalAsNumber = serverTotal.toDecimalPlaces(2).toNumber();
    const txRef = generateTxRef();
    const paymentToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

    const recentOrder = await prisma.order.findFirst({
      where: {
        userId: orderUser.id,
        status: OrderStatus.INITIATED,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        totalAmount: totalAsNumber,
      },
    });

    if (recentOrder) {
      const response = NextResponse.json({
        orderId: recentOrder.id,
        txRef: recentOrder.txRef,
        amount: totalAsNumber,
        userEmail: orderUser.email,
        userName: orderUser.name,
      });
      if (recentOrder.paymentToken) {
        response.cookies.set("payment_token", recentOrder.paymentToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60,
          path: "/",
        });
      }
      return response;
    }

    const { hash: receiptHash, salt: receiptSalt } = generateReceiptHash(txRef, txRef);

    const order = await prisma.order.create({
      data: {
        userId: orderUser.id,
        totalAmount: totalAsNumber,
        receiptHash,
        receiptSalt,
        txRef,
        status: OrderStatus.INITIATED,
        ipAddress,
        userAgent,
        paymentToken,
        tokenExpiresAt,
        items: {
          create: orderItems,
        },
      },
    });

    await logTransactionStep(order.id, txRef, "INITIATED", ipAddress, {
      itemCount: orderItems.length,
      total: totalAsNumber,
      userId: orderUser.id,
      guest: !session?.user?.id,
    });

    console.log("[ORDER] Step 1 INITIATED:", order.id, "txRef:", txRef, "amount:", totalAsNumber);

    const response = NextResponse.json({
      orderId: order.id,
      txRef,
      amount: totalAsNumber,
      userEmail: orderUser.email,
      userName: orderUser.name,
    });

    response.cookies.set("payment_token", paymentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string; code?: string };
    console.error("[ORDER] Create error:", err?.message || error);
    console.error("[ORDER] Stack:", err?.stack);

    const message =
      err?.code === "P2002"
        ? "Duplicate order detected. Please try again."
        : err?.code === "P1001" || err?.code === "P1002"
          ? "Database connection failed. Please try again in a moment."
          : "Could not create order. Please try again.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function logTransactionStep(
  orderId: string,
  txRef: string,
  step: string,
  ipAddress: string,
  metadata: Record<string, unknown>
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
