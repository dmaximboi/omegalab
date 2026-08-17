import { NextResponse } from "next/server";
import { PrismaClient, OrderStatus, Role } from "@prisma/client";
import Decimal from "decimal.js";
import { generateTxRef, generateReceiptHash } from "@/lib/payment";
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
const MAX_OPEN_ORDERS_PER_EMAIL = 3;

/**
 * Guest or signed-in checkout.
 * Buyer identity for THIS transaction is stored on the Order snapshot fields.
 * Shared emails no longer overwrite User.name (avoids mixed-tx confusion).
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

    const customerName = String(name).trim().slice(0, 120);
    const customerPhone = String(phone).replace(/\s+/g, "").slice(0, 20);
    const customerAddress = String(address).trim().slice(0, 500);

    if (customerPhone.length < 10 || customerPhone.length > 15) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const prisma = getPrisma();
    let orderUser: { id: string; email: string; name: string | null };
    let customerEmail: string;

    if (session?.user?.id && session?.user?.email) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, email: true, name: true },
      });
      if (!sessionUser) {
        return NextResponse.json({ error: "User not found" }, { status: 401 });
      }
      // Signed-in users may update their own profile name
      if (customerName && customerName !== sessionUser.name) {
        await prisma.user
          .update({ where: { id: sessionUser.id }, data: { name: customerName } })
          .catch(() => {});
      }
      orderUser = sessionUser;
      customerEmail = sessionUser.email;
    } else {
      customerEmail = String(bodyEmail || "")
        .trim()
        .toLowerCase()
        .slice(0, 190);
      if (!customerEmail || !EMAIL_RE.test(customerEmail)) {
        return NextResponse.json(
          { error: "A valid email is required to place an order" },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findUnique({
        where: { email: customerEmail },
        select: { id: true, email: true, name: true, role: true },
      });

      if (existing) {
        if (existing.role === Role.ADMIN) {
          return NextResponse.json(
            { error: "Please sign in to place an order with this email" },
            { status: 401 }
          );
        }
        // Do NOT overwrite existing.user.name — order snapshot holds this buyer's details
        orderUser = existing;
      } else {
        orderUser = await prisma.user.create({
          data: {
            email: customerEmail,
            name: customerName,
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

    const snapshot = {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
    };

    // Idempotency: same user + same cart total + same snapshot email within 5 min
    const recentOrder = await prisma.order.findFirst({
      where: {
        userId: orderUser.id,
        customerEmail,
        status: OrderStatus.INITIATED,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        totalAmount: totalAsNumber,
      },
    });

    if (recentOrder) {
      // Refresh snapshot on the reused order so this checkout's details win
      await prisma.order
        .update({
          where: { id: recentOrder.id },
          data: snapshot,
        })
        .catch(() => {});

      const response = NextResponse.json({
        orderId: recentOrder.id,
        txRef: recentOrder.txRef,
        amount: totalAsNumber,
        userEmail: customerEmail,
        userName: customerName,
        userPhone: customerPhone,
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

    // Limit unfinished checkouts sharing one email (after idempotency reuse)
    const openCount = await prisma.order.count({
      where: {
        customerEmail,
        status: { in: [OrderStatus.INITIATED, OrderStatus.PROCESSING, OrderStatus.VERIFYING] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (openCount >= MAX_OPEN_ORDERS_PER_EMAIL) {
      return NextResponse.json(
        {
          error:
            "You already have open checkouts with this email. Complete or wait for them to expire before starting another.",
        },
        { status: 429 }
      );
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
        ...snapshot,
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
      customerEmail,
    });

    console.log("[ORDER] Step 1 INITIATED:", order.id, "txRef:", txRef, "amount:", totalAsNumber);

    const response = NextResponse.json({
      orderId: order.id,
      txRef,
      amount: totalAsNumber,
      userEmail: customerEmail,
      userName: customerName,
      userPhone: customerPhone,
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
