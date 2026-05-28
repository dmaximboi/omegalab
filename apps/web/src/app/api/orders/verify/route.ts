import { NextResponse } from "next/server";
import { PrismaClient, OrderStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { verifyFlutterwavePayment } from "@/lib/flutterwave";
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

const EXPECTED_CURRENCY = "NGN";

// Timing-safe string comparison to prevent timing attacks on token validation
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: Request) {
  // Capture IP for audit
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";

  try {
    const body = await request.json();
    const { transaction_id, orderId, paymentToken } = body;
    // NOTE: we do NOT use tx_ref from frontend — we match from DB

    if (!transaction_id || !orderId || !paymentToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find the order — use the DB's own txRef, not the one from frontend
    const order = await getPrisma().order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      await logPayment({ txRef: null, flwRef: String(transaction_id), status: "order_not_found", ipAddress });
      // Use generic message to prevent order ID enumeration
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    // Payment token is REQUIRED and must match (timing-safe comparison)
    // This serves as the primary authorization for the verify endpoint
    if (!order.paymentToken || !timingSafeEqual(paymentToken, order.paymentToken)) {
      await logPayment({ orderId, txRef: order.txRef, flwRef: String(transaction_id), status: "step:FAILED:invalid_token", ipAddress });
      return NextResponse.json({ error: "Invalid payment token" }, { status: 403 });
    }

    // Check if token has expired
    if (order.tokenExpiresAt && new Date() > order.tokenExpiresAt) {
      await logPayment({ orderId, txRef: order.txRef, flwRef: String(transaction_id), status: "step:FAILED:token_expired", ipAddress });
      return NextResponse.json({ error: "Payment token has expired" }, { status: 400 });
    }

    // Prevent double verification (idempotent)
    if (order.paymentVerified) {
      return NextResponse.json({ message: "Payment already verified" });
    }

    // Check order isn't too old (24h expiry for pending orders)
    const orderAge = Date.now() - order.createdAt.getTime();
    if (orderAge > 24 * 60 * 60 * 1000) {
      await logPayment({ orderId, txRef: order.txRef, flwRef: String(transaction_id), status: "step:FAILED:expired", ipAddress });
      return NextResponse.json({ error: "Order has expired" }, { status: 400 });
    }

    // STEP 2: PROCESSING — Mark order as being processed
    await getPrisma().order.update({ where: { id: orderId }, data: { status: OrderStatus.PROCESSING } });
    await logPayment({ orderId, txRef: order.txRef, status: "step:PROCESSING", ipAddress });

    // STEP 3: VERIFYING — Server-to-server verification with Flutterwave
    await getPrisma().order.update({ where: { id: orderId }, data: { status: OrderStatus.VERIFYING } });
    await logPayment({ orderId, txRef: order.txRef, status: "step:VERIFYING", ipAddress });

    const flwResponse = await verifyFlutterwavePayment(String(transaction_id));

    // Security checks using Decimal.js — ALL must pass:
    // 1. Flutterwave says success
    // 2. tx_ref matches our DB record (not frontend-supplied)
    // 3. Amount >= our DB total (prevent underpayment) using Decimal comparison
    // 4. Currency is NGN (prevent currency substitution attack)
    const flwData = flwResponse?.data;
    const isSuccess = flwResponse?.status === "success" && flwData?.status === "successful";
    const txRefMatch = flwData?.tx_ref === order.txRef;
    const flwAmount = new Decimal(flwData?.amount || "0");
    const dbAmount = new Decimal(order.totalAmount.toString());
    const amountOk = flwAmount.gte(dbAmount);
    const currencyOk = flwData?.currency === EXPECTED_CURRENCY;

    if (isSuccess && txRefMatch && amountOk && currencyOk) {
      // Update order as paid
      await getPrisma().order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          paymentVerified: true,
          flwRef: String(transaction_id),
          verifiedAt: new Date(),
          verifiedBy: "callback",
        },
      });

      await logPayment({
        orderId,
        txRef: order.txRef,
        flwRef: String(transaction_id),
        amount: parseFloat(flwData.amount),
        status: "successful",
        responseCode: flwData.processor_response || "",
        responseData: JSON.stringify(flwData),
        ipAddress,
      });

      // STEP 4: PAID
      await logPayment({
        orderId,
        txRef: order.txRef,
        flwRef: String(transaction_id),
        amount: flwAmount.toNumber(),
        status: "step:PAID",
        responseCode: flwData.processor_response || "",
        responseData: JSON.stringify(flwData),
        ipAddress,
      });

      console.log("[PAYMENT] Step 4 PAID:", orderId);

      // Create success notification for the user
      await createNotification(order.userId, {
        type: "order_success",
        title: "Payment Successful! ✓",
        body: `Your order #${order.txRef} has been confirmed. Total: ₦${flwAmount.toNumber().toLocaleString()}. Your receipt is ready.`,
      });

      return NextResponse.json({ message: "Payment verified successfully" });
    } else {
      // STEP 5: FAILED
      const failReason = !isSuccess ? "flw_not_success" : !txRefMatch ? "txref_mismatch" : !amountOk ? "amount_mismatch" : "currency_mismatch";

      await getPrisma().order.update({ where: { id: orderId }, data: { status: OrderStatus.FAILED } });

      await logPayment({
        orderId,
        txRef: order.txRef,
        flwRef: String(transaction_id),
        status: `step:FAILED:${failReason}`,
        responseData: JSON.stringify(flwData || flwResponse),
        ipAddress,
      });

      console.error("[PAYMENT] Step 5 FAILED:", orderId, failReason);

      // Create failure notification for the user
      await createNotification(order.userId, {
        type: "order_failed",
        title: "Payment Failed",
        body: `Your payment for order #${order.txRef} could not be verified. Reference: ${transaction_id}. Please contact support if you were charged.`,
      });

      return NextResponse.json({ error: "Payment could not be verified", txRef: order.txRef }, { status: 400 });
    }
  } catch (error) {
    console.error("[PAYMENT] Verify error:", error);
    return NextResponse.json({ error: "Something went wrong. Please contact support." }, { status: 500 });
  }
}

// Helper to create user notifications without failing the main flow
async function createNotification(userId: string, data: { type: string; title: string; body: string }) {
  try {
    await getPrisma().notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        body: data.body,
      },
    });
  } catch (err) {
    console.error("[NOTIFICATION] Failed to create:", err);
  }
}

// Helper to log payments without failing the main flow
async function logPayment(data: {
  orderId?: string;
  txRef?: string | null;
  flwRef?: string;
  amount?: number;
  status: string;
  responseCode?: string;
  responseData?: string;
  ipAddress?: string;
}) {
  try {
    await getPrisma().paymentLog.create({
      data: {
        orderId: data.orderId || null,
        txRef: data.txRef || null,
        flwRef: data.flwRef || null,
        amount: data.amount || null,
        status: data.status,
        responseCode: data.responseCode || null,
        responseData: data.responseData || null,
        ipAddress: data.ipAddress || null,
      },
    });
  } catch (logErr) {
    console.error("[PAYMENT LOG] Failed to write log:", logErr);
  }
}
