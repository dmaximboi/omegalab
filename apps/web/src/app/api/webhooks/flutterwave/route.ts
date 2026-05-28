import { NextResponse } from "next/server";
import { PrismaClient, OrderStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { verifyFlutterwavePayment, verifyWebhookSignature } from "@/lib/flutterwave";

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

// Flutterwave webhook — backup payment verification
// This fires even if user closes browser before callback
export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";
  
  try {
    // Verify webhook signature
    const signature = request.headers.get("verif-hash");
    if (!verifyWebhookSignature(signature)) {
      console.error("[WEBHOOK] Invalid signature:", signature?.slice(0, 20) + "...");
      await logWebhookPayment(null, "unknown", "unknown", "invalid_signature", { signature: signature?.slice(0, 50) });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = await request.json();
    const { event, data } = body;

    console.log("[WEBHOOK] Received event:", event, "status:", data?.status);

    // Only process successful charges
    if (event !== "charge.completed" || data?.status !== "successful") {
      console.log("[WEBHOOK] Event ignored:", event, data?.status);
      await logWebhookPayment(null, data?.tx_ref || "unknown", data?.id || "unknown", `ignored:${event}:${data?.status}`, body);
      return NextResponse.json({ message: "Event ignored" });
    }

    const txRef = data.tx_ref;
    const transactionId = data.id;

    if (!txRef || !transactionId) {
      console.error("[WEBHOOK] Missing data - txRef:", txRef, "transactionId:", transactionId);
      await logWebhookPayment(null, "unknown", "unknown", "missing_data", body);
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    console.log("[WEBHOOK] Processing payment - txRef:", txRef, "transactionId:", transactionId);

    // Find order by txRef from our DB
    const order = await getPrisma().order.findUnique({
      where: { txRef },
    });

    if (!order) {
      console.error("[WEBHOOK] No order found for txRef:", txRef);
      await logWebhookPayment(null, txRef, String(transactionId), "order_not_found", body);
      return NextResponse.json({ message: "Order not found" });
    }

    console.log("[WEBHOOK] Order found:", order.id, "current status:", order.status, "paymentVerified:", order.paymentVerified);

    // Already verified — idempotent
    if (order.paymentVerified) {
      console.log("[WEBHOOK] Already verified, skipping");
      await logWebhookPayment(order.id, order.txRef, String(transactionId), "already_verified", body);
      return NextResponse.json({ message: "Already verified" });
    }

    // Double-verify with Flutterwave API (don't trust webhook payload alone)
    console.log("[WEBHOOK] Verifying with Flutterwave API...");
    const flwResponse = await verifyFlutterwavePayment(String(transactionId));
    const flwData = flwResponse?.data;

    console.log("[WEBHOOK] Flutterwave response status:", flwResponse?.status, "data status:", flwData?.status);

    const isSuccess = flwResponse?.status === "success" && flwData?.status === "successful";
    const txRefMatch = flwData?.tx_ref === order.txRef;
    const flwAmount = new Decimal(flwData?.amount || "0");
    const dbAmount = new Decimal(order.totalAmount.toString());
    const amountOk = flwAmount.gte(dbAmount);
    const currencyOk = flwData?.currency === EXPECTED_CURRENCY;

    console.log("[WEBHOOK] Verification checks:", { isSuccess, txRefMatch, amountOk, currencyOk });

    if (isSuccess && txRefMatch && amountOk && currencyOk) {
      console.log("[WEBHOOK] All checks passed, updating order to PAID");
      await getPrisma().order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paymentVerified: true,
          flwRef: String(transactionId),
          verifiedAt: new Date(),
          verifiedBy: "webhook",
        },
      });

      await logWebhookPayment(order.id, order.txRef, String(transactionId), "successful", {
        amount: flwData?.amount,
        currency: flwData?.currency,
        ipAddress,
      });
      console.log("[WEBHOOK] Payment verified successfully:", order.id);
    } else {
      const failReason = !isSuccess ? "flw_not_success" : !txRefMatch ? "txref_mismatch" : !amountOk ? "amount_mismatch" : "currency_mismatch";
      console.error("[WEBHOOK] Verification failed:", order.id, failReason);
      await logWebhookPayment(order.id, order.txRef, String(transactionId), `failed:${failReason}`, {
        failReason,
        flwStatus: flwData?.status,
        flwAmount: flwData?.amount,
        dbAmount: order.totalAmount.toString(),
        flwCurrency: flwData?.currency,
      });
    }

    // Always return 200 to Flutterwave so they don't retry
    return NextResponse.json({ message: "Webhook processed" });
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    await logWebhookPayment(null, "unknown", "unknown", "error", { error: String(error) });
    return NextResponse.json({ message: "Webhook error" }, { status: 200 });
  }
}

async function logWebhookPayment(
  orderId: string | null,
  txRef: string,
  flwRef: string,
  status: string,
  data: any
) {
  try {
    await getPrisma().paymentLog.create({
      data: {
        orderId,
        txRef,
        flwRef,
        status: `webhook:${status}`,
        webhookData: JSON.stringify(data),
      },
    });
  } catch (logErr) {
    console.error("[WEBHOOK LOG] Failed:", logErr);
  }
}
