import { NextResponse } from "next/server";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession, getCheckoutSession } from "@/lib/bachs";
import { getAppUrl, normalizeNgPhone, timingSafeEqualString } from "@/lib/payment";
import { logPayment } from "@/lib/fulfill-order";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  }
  return globalForPrisma.prisma;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";
  const orderId = params.id;

  try {
    const rate = await checkRateLimit(`checkout:${ipAddress}:${orderId}`, 8, 60000, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many checkout attempts. Please try again later." }, { status: 429 });
    }

    const cookieStore = cookies();
    const paymentToken = cookieStore.get("payment_token")?.value;
    const session = await getServerSession(authOptions);

    const order = await getPrisma().order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const tokenOk =
      Boolean(paymentToken) &&
      Boolean(order.paymentToken) &&
      timingSafeEqualString(paymentToken!, order.paymentToken!) &&
      order.tokenExpiresAt &&
      new Date() < order.tokenExpiresAt;

    const ownerOk = Boolean(session?.user?.id && session.user.id === order.userId);

    if (!tokenOk && !ownerOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (order.paymentVerified || order.status === OrderStatus.PAID) {
      return NextResponse.json({ alreadyPaid: true, orderId: order.id });
    }

    if (order.status === OrderStatus.FAILED || order.status === OrderStatus.CANCELLED) {
      return NextResponse.json({ error: "This order can no longer be paid" }, { status: 400 });
    }

    const orderAge = Date.now() - order.createdAt.getTime();
    if (orderAge > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Order has expired" }, { status: 400 });
    }

    if (order.checkoutId) {
      const existing = await getCheckoutSession(order.checkoutId);
      const status = String(existing?.status || "").toLowerCase();
      if (existing?.checkout_url && status === "open") {
        return NextResponse.json({ checkoutUrl: existing.checkout_url, checkoutId: order.checkoutId });
      }
    }

    const amount = Number(order.totalAmount.toString());
    const appUrl = getAppUrl();
    const customerEmail = order.customerEmail || order.user.email;
    const customerName = order.customerName || order.user.name || "Customer";
    const customerPhone = order.customerPhone ? normalizeNgPhone(order.customerPhone) : undefined;

    const result = await createCheckoutSession(
      {
        txRef: order.txRef,
        amount,
        currency: process.env.PAYMENT_CURRENCY || "NGN",
        customerEmail,
        customerName,
        customerPhone,
        successUrl: `${appUrl}/payment/${order.id}/return`,
        cancelUrl: `${appUrl}/payment/${order.id}`,
        metadata: {
          order_id: order.id,
          tx_ref: order.txRef,
        },
      },
      order.checkoutId
        ? `order:${order.id}:${order.txRef}:next:${order.checkoutId}`
        : `order:${order.id}:${order.txRef}`
    );

    if (result.status !== "success" || !result.data) {
      await logPayment(getPrisma(), {
        orderId: order.id,
        txRef: order.txRef,
        status: "step:FAILED:checkout_create",
        responseData: result.message,
        ipAddress,
      });
      return NextResponse.json({ error: result.message || "Could not start payment" }, { status: 502 });
    }

    await getPrisma().order.update({
      where: { id: order.id },
      data: {
        checkoutId: result.data.checkoutId,
        status: OrderStatus.PROCESSING,
      },
    });

    await logPayment(getPrisma(), {
      orderId: order.id,
      txRef: order.txRef,
      flwRef: result.data.checkoutId,
      status: "step:PROCESSING",
      ipAddress,
    });

    return NextResponse.json({
      checkoutUrl: result.data.checkoutUrl,
      checkoutId: result.data.checkoutId,
    });
  } catch (error) {
    console.error("[CHECKOUT] Error:", error);
    return NextResponse.json({ error: "Could not start payment" }, { status: 500 });
  }
}
