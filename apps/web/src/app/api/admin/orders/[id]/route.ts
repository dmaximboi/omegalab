import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, category: true } } },
        },
        user: { select: { id: true, name: true, email: true, createdAt: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get ALL payment logs for this order — full audit trail
    const logs = await prisma.paymentLog.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    });

    // Build detailed timeline with human-readable explanations
    const timeline = logs.map((log, index) => {
      const stepName = log.status || "unknown";
      let parsedData: any = null;
      let parsedWebhook: any = null;

      try {
        if (log.responseData) parsedData = JSON.parse(log.responseData);
      } catch { parsedData = log.responseData; }

      try {
        if ((log as any).webhookData) parsedWebhook = JSON.parse((log as any).webhookData);
      } catch { /* ignore */ }

      return {
        index: index + 1,
        step: stepName,
        explanation: getStepExplanation(stepName),
        timestamp: log.createdAt,
        timeSinceOrderCreated: Math.round((log.createdAt.getTime() - order.createdAt.getTime()) / 1000),
        ipAddress: log.ipAddress || null,
        amount: log.amount ? parseFloat(log.amount.toString()) : null,
        flwRef: log.flwRef || null,
        txRef: log.txRef || null,
        responseCode: log.responseCode || null,
        rawData: parsedData,
        webhookData: parsedWebhook,
      };
    });

    // Calculate transaction duration
    const firstStep = logs[0];
    const lastStep = logs[logs.length - 1];
    const durationMs = firstStep && lastStep
      ? lastStep.createdAt.getTime() - firstStep.createdAt.getTime()
      : 0;

    return NextResponse.json({
      order: {
        id: order.id,
        txRef: order.txRef,
        receiptHash: order.receiptHash,
        status: order.status,
        totalAmount: parseFloat(order.totalAmount.toString()),
        paymentVerified: order.paymentVerified,
        flwRef: order.flwRef,
        ipAddress: order.ipAddress,
        userAgent: order.userAgent,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        verifiedAt: order.verifiedAt,
        verifiedBy: order.verifiedBy,
      },
      customer: {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
        memberSince: order.user.createdAt,
      },
      items: order.items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        category: item.product.category,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
        lineTotal: parseFloat(item.unitPrice.toString()) * item.quantity,
      })),
      timeline,
      summary: {
        totalSteps: timeline.length,
        durationSeconds: Math.round(durationMs / 1000),
        finalStatus: order.status,
        wasVerifiedByWebhook: order.verifiedBy === "webhook",
        wasVerifiedByCallback: order.verifiedBy === "callback",
        securityFlags: getSecurityFlags(timeline),
      },
    });
  } catch (error) {
    console.error("[ADMIN ORDER DETAIL] Error:", error);
    return NextResponse.json({ error: "Failed to fetch order details" }, { status: 500 });
  }
}

function getStepExplanation(step: string): string {
  const explanations: Record<string, string> = {
    "step:INITIATED": "Order was created in the database. Server validated all product IDs exist and are active, fetched prices from DB (never trusting frontend), computed total using Decimal.js for precision, generated cryptographic txRef and HMAC receipt hash with salt, logged IP address and user agent.",
    "step:PROCESSING": "The customer opened the Flutterwave Inline checkout modal. Payment is being processed by Flutterwave's secure gateway. The order status was updated to PROCESSING.",
    "step:VERIFYING": "Server initiated a server-to-server verification call to Flutterwave API (GET /v3/transactions/:id/verify). This is the critical security step where we verify the payment independently of what the frontend reports.",
    "step:PAID": "ALL security checks passed: (1) Flutterwave confirms status=successful, (2) tx_ref from Flutterwave matches our DB record, (3) paid amount >= order total (Decimal comparison), (4) currency is NGN. Order marked as PAID.",
    "step:FAILED:flw_not_success": "Flutterwave reported the transaction as failed or not successful. Common causes: insufficient funds, card declined, bank timeout, 3DS authentication failed, or customer abandoned checkout.",
    "step:FAILED:txref_mismatch": "CRITICAL SECURITY: The tx_ref returned by Flutterwave does not match what we stored in our DB. This indicates a potential replay attack or someone trying to apply a different payment to this order.",
    "step:FAILED:amount_mismatch": "CRITICAL SECURITY: The amount verified by Flutterwave is LESS than our order total. Someone may have tampered with the checkout amount. Decimal.js comparison caught the discrepancy.",
    "step:FAILED:currency_mismatch": "CRITICAL SECURITY: Payment was received in a currency other than NGN. This is a currency substitution attack attempting to pay less by using a weaker currency.",
    "step:FAILED:expired": "Order exceeded the 24-hour payment window. Pending orders automatically expire to prevent indefinite holds.",
    "successful": "Server-to-server verification with Flutterwave confirmed the payment was successful.",
    "webhook:successful": "Flutterwave webhook notification received as backup. Webhook signature verified, then server re-verified the transaction via API. Both checks passed.",
  };

  for (const [key, explanation] of Object.entries(explanations)) {
    if (step.includes(key) || step === key) return explanation;
  }

  if (step.includes("FAILED")) return `Transaction failed at this step. Reason code: ${step}. Check raw data for details.`;
  if (step.includes("webhook")) return `Webhook event received: ${step}. Webhook signature was validated before processing.`;

  return `Transaction step recorded: ${step}`;
}

function getSecurityFlags(timeline: any[]): string[] {
  const flags: string[] = [];

  const hasFailure = timeline.some((t) => t.step.includes("FAILED"));
  const hasMismatch = timeline.some((t) => t.step.includes("mismatch"));
  const multipleIps = new Set(timeline.filter((t) => t.ipAddress).map((t) => t.ipAddress)).size > 1;

  if (hasMismatch) flags.push("SECURITY_ALERT: Mismatch detected — possible tampering");
  if (multipleIps) flags.push("NOTICE: Multiple IP addresses detected in transaction");
  if (hasFailure && !hasMismatch) flags.push("Payment failed — likely customer-side issue");

  if (flags.length === 0) flags.push("No security concerns detected");

  return flags;
}
