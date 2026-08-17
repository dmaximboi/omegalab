import { NextResponse } from "next/server";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isValidCheckoutId } from "@/lib/bachs";
import { timingSafeEqualString } from "@/lib/payment";
import { logPayment, verifyAndFulfillOrder } from "@/lib/fulfill-order";

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

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";

  try {
    const body = await request.json();
    const orderId = typeof body.orderId === "string" ? body.orderId : "";

    if (!orderId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cookieStore = cookies();
    const paymentToken = cookieStore.get("payment_token")?.value;
    const session = await getServerSession(authOptions);

    const order = await getPrisma().order.findUnique({ where: { id: orderId } });
    if (!order) {
      await logPayment(getPrisma(), { orderId, status: "order_not_found", ipAddress });
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const tokenOk =
      Boolean(paymentToken) &&
      Boolean(order.paymentToken) &&
      timingSafeEqualString(paymentToken!, order.paymentToken!) &&
      (!order.tokenExpiresAt || new Date() <= order.tokenExpiresAt);

    const ownerOk = Boolean(session?.user?.id && session.user.id === order.userId);

    if (!tokenOk && !ownerOk) {
      await logPayment(getPrisma(), {
        orderId,
        txRef: order.txRef,
        status: "step:FAILED:invalid_token",
        ipAddress,
      });
      return NextResponse.json({ error: "Invalid payment token" }, { status: 403 });
    }

    if (order.paymentVerified) {
      const response = NextResponse.json({ message: "Payment already verified" });
      response.cookies.delete("payment_token");
      return response;
    }

    const orderAge = Date.now() - order.createdAt.getTime();
    if (orderAge > 24 * 60 * 60 * 1000) {
      await logPayment(getPrisma(), {
        orderId,
        txRef: order.txRef,
        status: "step:FAILED:expired",
        ipAddress,
      });
      return NextResponse.json({ error: "Order has expired" }, { status: 400 });
    }

    const checkoutId = order.checkoutId || "";
    if (!checkoutId || !isValidCheckoutId(checkoutId)) {
      return NextResponse.json({ error: "Missing checkout session" }, { status: 400 });
    }

    await getPrisma().order.update({ where: { id: orderId }, data: { status: OrderStatus.VERIFYING } });
    await logPayment(getPrisma(), { orderId, txRef: order.txRef, status: "step:VERIFYING", ipAddress });

    const result = await verifyAndFulfillOrder({
      prisma: getPrisma(),
      order,
      checkoutId,
      ipAddress,
      verifiedBy: "callback",
    });

    if (result.ok) {
      return NextResponse.json({ message: "Payment verified successfully" });
    }

    if (result.reason === "still_open") {
      await getPrisma().order.update({ where: { id: orderId }, data: { status: OrderStatus.PROCESSING } });
      return NextResponse.json({ error: "Payment is still pending", pending: true }, { status: 202 });
    }

    const definitiveFailure = result.reason === "not_success";
    if (definitiveFailure) {
      await getPrisma().order.update({ where: { id: orderId }, data: { status: OrderStatus.FAILED } });
    } else {
      await getPrisma().order.update({ where: { id: orderId }, data: { status: OrderStatus.INITIATED } });
    }

    const response = NextResponse.json(
      { error: "Payment could not be verified", txRef: order.txRef },
      { status: 400 }
    );
    if (definitiveFailure) {
      response.cookies.delete("payment_token");
    }
    return response;
  } catch (error) {
    console.error("[PAYMENT] Verify error:", error);
    return NextResponse.json({ error: "Something went wrong. Please contact support." }, { status: 500 });
  }
}
