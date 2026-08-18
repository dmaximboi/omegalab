import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { parseLogResponseData } from "@/lib/payment-log";
import { getPaymentStepDescription } from "@/lib/payment-step-labels";

export const dynamic = "force-dynamic";

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

    const logs = await getPrisma().paymentLog.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    });

    const timeline = logs.map((log: typeof logs[number], index: number) => {
      const stepName = log.status || "unknown";

      return {
        index: index + 1,
        step: stepName,
        explanation: getPaymentStepDescription(stepName),
        timestamp: log.createdAt,
        timeSinceOrderCreated: Math.round(
          (log.createdAt.getTime() - order.createdAt.getTime()) / 1000
        ),
        ipAddress: log.ipAddress || null,
        amount: log.amount ? parseFloat(log.amount.toString()) : null,
        providerRef: log.providerRef || null,
        txRef: log.txRef || null,
        responseCode: log.responseCode || null,
        rawData: parseLogResponseData(log.responseData),
        webhookData: parseLogResponseData(log.webhookData),
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
        providerRef: order.providerRef,
        checkoutId: order.checkoutId || null,
        orderCurrency: order.orderCurrency || "NGN",
        paymentCurrency: order.paymentCurrency || null,
        paymentAmount: order.paymentAmount ? parseFloat(order.paymentAmount.toString()) : null,
        fxRate: order.fxRate ? parseFloat(order.fxRate.toString()) : null,
        fxBufferPercent: order.fxBufferPercent ? parseFloat(order.fxBufferPercent.toString()) : null,
        fxSource: order.fxSource || null,
        fxQuotedAt: order.fxQuotedAt || null,
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

function getSecurityFlags(timeline: Array<{ step: string; ipAddress: string | null }>): string[] {
  const flags: string[] = [];
  const hasFailure = timeline.some((t) => t.step.includes("FAILED"));
  const hasMismatch = timeline.some((t) => t.step.includes("mismatch"));
  const multipleIps =
    new Set(timeline.filter((t) => t.ipAddress).map((t) => t.ipAddress)).size > 1;

  if (hasMismatch) flags.push("SECURITY_ALERT: Mismatch detected, possible tampering");
  if (multipleIps) flags.push("NOTICE: Multiple IP addresses in transaction lifecycle");
  if (hasFailure && !hasMismatch) flags.push("Payment failed, likely customer side issue");
  if (flags.length === 0) flags.push("No security concerns detected");
  return flags;
}
