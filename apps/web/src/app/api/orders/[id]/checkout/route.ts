import { NextResponse } from "next/server";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession, getCheckoutSession } from "@/lib/bachs";
import { getAppUrl, normalizeNgPhone, timingSafeEqualString } from "@/lib/payment";
import { logPayment } from "@/lib/fulfill-order";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  quoteNgnToUsd,
  estimateNgnAtRate,
  validateLockedQuote,
  sessionAmountMatchesLocked,
  FxRateError,
  getFxConfig,
} from "@/lib/fx";
import { syncOrderCheckoutState } from "@/lib/order-checkout-sync";

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

    let order = await prisma.order.findUnique({
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

    await syncOrderCheckoutState(prisma, order);
    const refreshedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!refreshedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    order = refreshedOrder;

    const fxConfig = getFxConfig();
    let existingSession = null;

    if (order.checkoutId) {
      existingSession = await getCheckoutSession(order.checkoutId);
      const status = String(existingSession?.status || "").toLowerCase();
      const quoteValid = validateLockedQuote(order, fxConfig.quoteTtlMinutes);
      const sessionAmount = existingSession?.amount ?? existingSession?.charge?.amount ?? null;
      const amountMatches =
        order.paymentAmount &&
        sessionAmountMatchesLocked(sessionAmount, order.paymentAmount);

      if (existingSession?.checkout_url && status === "open" && quoteValid && amountMatches) {
        return NextResponse.json({
          checkoutUrl: existingSession.checkout_url,
          checkoutId: order.checkoutId,
          orderCurrency: order.orderCurrency || "NGN",
          orderAmount: Number(order.totalAmount.toString()),
          paymentCurrency: order.paymentCurrency || "USD",
          paymentAmount: Number(order.paymentAmount!.toString()),
          estimatedCheckoutNgn: estimateNgnAtRate(
            order.paymentAmount!.toString(),
            order.fxRate!.toString()
          ).toNumber(),
        });
      }
    }

    const quote = await quoteNgnToUsd(order.totalAmount.toString(), fxConfig);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderCurrency: "NGN",
        paymentCurrency: "USD",
        paymentAmount: quote.paymentAmountUsd.toNumber(),
        fxRate: quote.ngnPerUsd.toNumber(),
        fxBufferPercent: quote.bufferPercent.toNumber(),
        fxQuotedAt: quote.quotedAt,
        fxSource: "live",
        ...(order.checkoutId ? { checkoutId: null } : {}),
      },
    });

    const paymentCurrency = (process.env.PAYMENT_CURRENCY || "USD").toUpperCase();
    const usdAmount = quote.paymentAmountUsd.toNumber();
    const appUrl = getAppUrl();
    const customerEmail = order.customerEmail || order.user.email;
    const customerName = order.customerName || order.user.name || "Customer";
    const customerPhone = order.customerPhone ? normalizeNgPhone(order.customerPhone) : undefined;
    const orderAmountNgn = order.totalAmount.toString();

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
          order_amount_ngn: orderAmountNgn,
          fx_rate: quote.ngnPerUsd.toFixed(4),
          fx_live_rate: quote.liveNgnPerUsd.toFixed(4),
        },
      },
      order.checkoutId
        ? `order:${order.id}:${order.txRef}:next:${order.checkoutId}:${usdAmount}`
        : `order:${order.id}:${order.txRef}:usd:${usdAmount}:${quote.quotedAt.getTime()}`
    );

    if (result.status !== "success" || !result.data) {
      console.error("[CHECKOUT] Provider rejected session:", result.message);
      await logPayment(prisma, {
        orderId: order.id,
        txRef: order.txRef,
        status: "step:FAILED:checkout_create",
        responseData: result.message,
        ipAddress,
      });
      return NextResponse.json(
        { error: "Payment could not be started. Please try again or contact support." },
        { status: 502 }
      );
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
      providerRef: result.data.checkoutId,
      amount: usdAmount,
      status: "step:PROCESSING",
      responseData: JSON.stringify({
        orderCurrency: "NGN",
        orderAmountNgn,
        paymentCurrency,
        paymentAmountUsd: usdAmount,
        fxRate: quote.ngnPerUsd.toString(),
        fxLiveRate: quote.liveNgnPerUsd.toString(),
        fxBufferPercent: quote.bufferPercent.toString(),
      }),
      ipAddress,
    });

    return NextResponse.json({
      checkoutUrl: result.data.checkoutUrl,
      checkoutId: result.data.checkoutId,
      orderCurrency: "NGN",
      orderAmount: Number(orderAmountNgn),
      paymentCurrency,
      paymentAmount: usdAmount,
      estimatedCheckoutNgn: estimateNgnAtRate(usdAmount, quote.liveNgnPerUsd).toNumber(),
    });
  } catch (error) {
    if (error instanceof FxRateError) {
      console.error("[CHECKOUT] FX error:", error.message);
      return NextResponse.json(
        { error: "Exchange rate is unavailable. Please try again in a few minutes." },
        { status: 503 }
      );
    }
    console.error("[CHECKOUT] Error:", error);
    return NextResponse.json(
      { error: "Payment could not be started. Please try again or contact support." },
      { status: 500 }
    );
  }
}
