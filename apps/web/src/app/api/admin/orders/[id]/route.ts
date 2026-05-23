import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    // README rule: admin routes return 403 not 401 (no info leakage about resource existence)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      "The customer opened the Flutterwave Inline checkout modal. Payment is being processed by Flutterwave's secure gateway. Waiting for customer to complete payment.",
    "step:VERIFYING":
      "Server initiated a server-to-server verification call to Flutterwave API (GET /v3/transactions/:id/verify). Critical security step: verifies independently of frontend report.",
    "step:PAID":
      "ALL security checks passed: (1) Flutterwave confirms status=successful, (2) tx_ref from Flutterwave matches DB record, (3) paid amount >= order total (Decimal comparison), (4) currency is NGN. Order marked PAID.",
    "step:FAILED:flw_not_success":
      "Flutterwave reported the transaction as failed. Causes: insufficient funds, card declined, bank timeout, 3DS failure, or customer abandonment.",
    "step:FAILED:txref_mismatch":
      "SECURITY ALERT: The tx_ref from Flutterwave does NOT match our DB record. Possible replay attack or payment manipulation. IP has been logged.",
    "step:FAILED:amount_mismatch":
      "SECURITY ALERT: Amount paid is LESS than order total. Possible checkout tampering. Decimal.js comparison caught the discrepancy.",
    "step:FAILED:currency_mismatch":
      "SECURITY ALERT: Payment received in non-NGN currency. Currency substitution attack detected.",
    "step:FAILED:expired":
      "Order exceeded 24-hour payment window and was automatically expired.",
    "webhook:successful":
      "Flutterwave webhook received as backup confirmation. HMAC-SHA256 signature verified against raw body. Server-to-server re-verification passed.",
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
  const hasFailure = timeline.some((t) => t.step.includes("FAILED"));
  const hasMismatch = timeline.some((t) => t.step.includes("mismatch"));
  const multipleIps =
    new Set(timeline.filter((t) => t.ipAddress).map((t) => t.ipAddress)).size > 1;

  if (hasMismatch) flags.push("SECURITY_ALERT: Mismatch detected — possible tampering");
  if (multipleIps) flags.push("NOTICE: Multiple IP addresses detected in transaction lifecycle");
  if (hasFailure && !hasMismatch) flags.push("Payment failed — likely customer-side issue");
  if (flags.length === 0) flags.push("No security concerns detected");
  return flags;
}