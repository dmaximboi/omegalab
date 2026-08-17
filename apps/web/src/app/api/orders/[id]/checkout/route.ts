import { NextResponse } from "next/server";
import { PrismaClient, OrderStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession, getCheckoutSession } from "@/lib/bachs";
import { getAppUrl, normalizeNgPhone, timingSafeEqualString } from "@/lib/payment";
import { logPayment } from "@/lib/fulfill-order";
import { checkRateLimit } from "@/lib/rate-limit";
import { quoteNgnToUsd, type FxQuote } from "@/lib/fx";

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
    const prisma = getPrisma();

    const order = await prisma.order.findUnique({
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
        return NextResponse.json({
          checkoutUrl: existing.checkout_url,
          checkoutId: order.checkoutId,
          orderCurrency: order.orderCurrency || "NGN",
          orderAmount: Number(order.totalAmount.toString()),
          paymentCurrency: order.paymentCurrency || "USD",
          paymentAmount: order.paymentAmount ? Number(order.paymentAmount.toString()) : undefined,
        });
      }
    }

    // Lock FX quote once; reuse on retries so amount never drifts mid-checkout
    let quote: FxQuote;
    if (
      order.paymentAmount &&
      order.fxRate &&
      order.fxBufferPercent != null &&
      order.fxQuotedAt &&
      order.paymentCurrency
    ) {
      quote = {
        ngnPerUsd: new Decimal(order.fxRate.toString()),
        bufferPercent: new Decimal(order.fxBufferPercent.toString()),
        paymentAmountUsd: new Decimal(order.paymentAmount.toString()),
        source: order.fxSource === "live" ? "live" : "fallback",
        quotedAt: order.fxQuotedAt,
      };
    } else {
      quote = await quoteNgnToUsd(order.totalAmount.toString());
      await prisma.order.update({
        where: { id: order.id },
        data: {
          orderCurrency: "NGN",
          paymentCurrency: "USD",
          paymentAmount: quote.paymentAmountUsd.toNumber(),
          fxRate: quote.ngnPerUsd.toNumber(),
          fxBufferPercent: quote.bufferPercent.toNumber(),
          fxQuotedAt: quote.quotedAt,
          fxSource: quote.source,
        },
      });
    }

    const paymentCurrency = (process.env.PAYMENT_CURRENCY || "USD").toUpperCase();
    const usdAmount = quote.paymentAmountUsd.toNumber();
    const appUrl = getAppUrl();
    const customerEmail = order.customerEmail || order.user.email;
    const customerName = order.customerName || order.user.name || "Customer";
    const customerPhone = order.customerPhone ? normalizeNgPhone(order.customerPhone) : undefined;

    const result = await createCheckoutSession(
      {
        txRef: order.txRef,
        amount: usdAmount,
        currency: paymentCurrency,
        customerEmail,
        customerName,
        customerPhone,
        successUrl: `${appUrl}/payment/${order.id}/return`,
        cancelUrl: `${appUrl}/payment/${order.id}`,
        metadata: {
          order_id: order.id,
          tx_ref: order.txRef,
          order_currency: "NGN",
          order_amount_ngn: order.totalAmount.toString(),
          fx_rate: quote.ngnPerUsd.toFixed(4),
          fx_source: quote.source,
        },
      },
      order.checkoutId
        ? `order:${order.id}:${order.txRef}:next:${order.checkoutId}`
        : `order:${order.id}:${order.txRef}:usd:${usdAmount}`
    );

    if (result.status !== "success" || !result.data) {
      await logPayment(prisma, {
        orderId: order.id,
        txRef: order.txRef,
        status: "step:FAILED:checkout_create",
        responseData: result.message,
        ipAddress,
      });
      return NextResponse.json({ error: result.message || "Could not start payment" }, { status: 502 });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        checkoutId: result.data.checkoutId,
        status: OrderStatus.PROCESSING,
      },
    });

    await logPayment(prisma, {
      orderId: order.id,
      txRef: order.txRef,
      flwRef: result.data.checkoutId,
      amount: usdAmount,
      status: "step:PROCESSING",
      responseData: JSON.stringify({
        orderCurrency: "NGN",
        orderAmountNgn: order.totalAmount.toString(),
        paymentCurrency,
        paymentAmountUsd: usdAmount,
        fxRate: quote.ngnPerUsd.toString(),
        fxBufferPercent: quote.bufferPercent.toString(),
        fxSource: quote.source,
      }),
      ipAddress,
    });

    return NextResponse.json({
      checkoutUrl: result.data.checkoutUrl,
      checkoutId: result.data.checkoutId,
      orderCurrency: "NGN",
      orderAmount: Number(order.totalAmount.toString()),
      paymentCurrency,
      paymentAmount: usdAmount,
    });
  } catch (error) {
    console.error("[CHECKOUT] Error:", error);
    const message = error instanceof Error ? error.message : "Could not start payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
