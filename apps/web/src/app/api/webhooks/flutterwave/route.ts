import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { verifyFlutterwavePayment, verifyWebhookSignature } from "@/lib/flutterwave";

export const dynamic = "force-dynamic";

// Singleton Prisma client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const EXPECTED_CURRENCY = "NGN";

// Flutterwave webhook — backup payment verification
// This fires even if user closes browser before callback
export async function POST(request: Request) {
  try {
    // Verify webhook signature
    const signature = request.headers.get("verif-hash");
    if (!verifyWebhookSignature(signature)) {
      console.error("[WEBHOOK] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = await request.json();
    const { event, data } = body;

    // Only process successful charges
    if (event !== "charge.completed" || data?.status !== "successful") {
      return NextResponse.json({ message: "Event ignored" });
    }

    const txRef = data.tx_ref;
    const transactionId = data.id;

    if (!txRef || !transactionId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Find order by txRef from our DB
    const order = await prisma.order.findUnique({
      where: { txRef },
    });

    if (!order) {
      console.error("[WEBHOOK] No order found for txRef:", txRef);
      await logWebhookPayment(null, txRef, String(transactionId), "order_not_found", body);
      return NextResponse.json({ message: "Order not found" });
    }

    // Already verified — idempotent
    if (order.paymentVerified) {
      return NextResponse.json({ message: "Already verified" });
    }

    // Double-verify with Flutterwave API (don't trust webhook payload alone)
    const flwResponse = await verifyFlutterwavePayment(String(transactionId));
    const flwData = flwResponse?.data;

    const isSuccess = flwResponse?.status === "success" && flwData?.status === "successful";
    const txRefMatch = flwData?.tx_ref === order.txRef;
    const flwAmount = new Decimal(flwData?.amount || "0");
    const dbAmount = new Decimal(order.totalAmount.toString());
    const amountOk = flwAmount.gte(dbAmount);
    const currencyOk = flwData?.currency === EXPECTED_CURRENCY;

    if (isSuccess && txRefMatch && amountOk && currencyOk) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paymentVerified: true,
          flwRef: String(transactionId),
          verifiedAt: new Date(),
          verifiedBy: "webhook",
        },
      });

      await logWebhookPayment(order.id, order.txRef, String(transactionId), "successful", flwData);
      console.log("[WEBHOOK] Payment verified:", order.id);
    } else {
      const failReason = !isSuccess ? "flw_not_success" : !txRefMatch ? "txref_mismatch" : !amountOk ? "amount_mismatch" : "currency_mismatch";
      await logWebhookPayment(order.id, order.txRef, String(transactionId), `failed:${failReason}`, flwData || flwResponse);
      console.error("[WEBHOOK] Verification failed:", order.id, failReason);
    }

    // Always return 200 to Flutterwave so they don't retry
    return NextResponse.json({ message: "Webhook processed" });
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
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
    await prisma.paymentLog.create({
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
