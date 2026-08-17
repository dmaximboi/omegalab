import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Lazy Prisma client - only instantiated when first accessed
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    // Non-admins get 404 — do not reveal that admin APIs exist
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const order = await getPrisma().order.findUnique({
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
    const logs = await getPrisma().paymentLog.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    });

    // Build detailed timeline with human-readable explanations
    const timeline = logs.map((log: typeof logs[number], index: number) => {
      const stepName = log.status || "unknown";
      let parsedData: unknown = null;
      let parsedWebhook: unknown = null;

      try {
        if (log.responseData) parsedData = JSON.parse(log.responseData);
      } catch { parsedData = log.responseData; }

      try {
        if ((log as any).webhookData) {
          parsedWebhook = JSON.parse((log as any).webhookData);
        }
      } catch { /* ignore */ }

      return {
        index: index + 1,
        step: stepName,
        explanation: getStepExplanation(stepName),
        timestamp: log.createdAt,
        timeSinceOrderCreated: Math.round(
          (log.createdAt.getTime() - order.createdAt.getTime()) / 1000
        ),
        ipAddress: log.ipAddress || null,
        amount: log.amount ? parseFloat(log.amount.toString()) : null,
        flwRef: log.flwRef || null,
        txRef: log.txRef || null,
        responseCode: log.responseCode || null,
        rawData: parsedData,
        webhookData: parsedWebhook,
      };
    });

    const firstStep = logs[0];
    const lastStep = logs[logs.length - 1];
    const durationMs =
      firstStep && lastStep
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
        checkoutId: order.checkoutId || null,
        ipAddress: order.ipAddress,
        userAgent: order.userAgent,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        verifiedAt: order.verifiedAt,
        verifiedBy: order.verifiedBy,
      },
      customer: {
        id: order.user.id,
        name: order.customerName || order.user.name,
        email: order.customerEmail || order.user.email,
        phone: order.customerPhone || null,
        address: order.customerAddress || null,
        accountEmail: order.user.email,
        memberSince: order.user.createdAt,
      },
      items: order.items.map((item: typeof order.items[number]) => ({
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
    "step:INITIATED":
      "Order was created in the database. Server validated all product IDs exist and are active, fetched prices from DB (never trusting frontend), computed total using Decimal.js for precision, generated cryptographic txRef and HMAC receipt hash with salt, logged IP address and user agent.",
    "step:PROCESSING":
      "The customer was redirected to Bachs hosted checkout. Card and bank details are collected by Bachs, not this site. Waiting for the customer to complete payment.",
    "step:VERIFYING":
      "Server initiated a server-to-server verification call to Bachs (GET /v1/checkout-sessions/:id). Critical security step: verifies independently of the browser redirect.",
    "step:PAID":
      "ALL security checks passed: (1) Bachs session status is completed, (2) checkout reference matches our txRef, (3) paid amount >= order total (Decimal comparison), (4) currency is NGN, (5) metadata.order_id matches. Order marked PAID.",
    "step:FAILED:not_success":
      "Bachs reported the checkout as not successful. Causes: insufficient funds, card declined, bank timeout, or customer abandonment.",
    "step:FAILED:txref_mismatch":
      "SECURITY ALERT: The reference from Bachs does NOT match our DB record. Possible replay attack or payment manipulation. IP has been logged.",
    "step:VERIFY_REJECTED:checkout_mismatch":
      "SECURITY ALERT: The checkout_id from the client does not match the session stored on this order.",
    "step:FAILED:amount_mismatch":
      "SECURITY ALERT: Amount paid is LESS than order total. Possible checkout tampering. Decimal.js comparison caught the discrepancy.",
    "step:FAILED:currency_mismatch":
      "SECURITY ALERT: Payment received in non-NGN currency. Currency substitution attack detected.",
    "step:FAILED:expired":
      "Order exceeded 24-hour payment window and was automatically expired.",
    "webhook:successful":
      "Bachs webhook received as backup confirmation. HMAC-SHA256 signature verified with timestamp replay window. Server-to-server re-verification passed.",
    "webhook:collection.succeeded":
      "Bachs collection.succeeded webhook received. Signature verified; checkout session re-fetched from Bachs before fulfillment.",
  };

  for (const [key, explanation] of Object.entries(explanations)) {
    if (step.includes(key) || step === key) return explanation;
  }

  if (step.includes("FAILED"))
    return `Transaction failed. Reason code: ${step}. Check raw data for debugging.`;
  if (step.includes("webhook"))
    return `Webhook event: ${step}. HMAC signature was validated before processing.`;
  return `Transaction step recorded: ${step}`;
}

function getSecurityFlags(timeline: Array<{ step: string; ipAddress: string | null }>): string[] {
  const flags: string[] = [];
  const hasFailure = timeline.some((t: typeof timeline[number]) => t.step.includes("FAILED"));
  const hasMismatch = timeline.some((t: typeof timeline[number]) => t.step.includes("mismatch"));
  const multipleIps =
    new Set(timeline.filter((t: typeof timeline[number]) => t.ipAddress).map((t: typeof timeline[number]) => t.ipAddress)).size > 1;

  if (hasMismatch) flags.push("SECURITY_ALERT: Mismatch detected — possible tampering");
  if (multipleIps) flags.push("NOTICE: Multiple IP addresses detected in transaction lifecycle");
  if (hasFailure && !hasMismatch) flags.push("Payment failed — likely customer-side issue");
  if (flags.length === 0) flags.push("No security concerns detected");
  return flags;
}