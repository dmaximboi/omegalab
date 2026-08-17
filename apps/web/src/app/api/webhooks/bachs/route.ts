import { NextResponse } from "next/server";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { verifyBachsWebhookSignature, isValidCheckoutId } from "@/lib/bachs";
import { logPayment, logSecurityEvent, verifyAndFulfillOrder } from "@/lib/fulfill-order";

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

interface BachsEvent {
  id: string;
  type: string;
  created_at?: string;
  organization_id?: string;
  data?: {
    charge_id?: string | null;
    checkout_id?: string;
    reference?: string;
    status?: string;
    amount?: string;
    currency?: string;
    metadata?: Record<string, string>;
  };
}

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";
  const prisma = getPrisma();

  try {
    const rawBody = await request.text();
    const timestamp = request.headers.get("x-bachs-timestamp") || request.headers.get("X-Bachs-Timestamp");
    const signature = request.headers.get("x-bachs-signature") || request.headers.get("X-Bachs-Signature");

    if (!verifyBachsWebhookSignature(rawBody, timestamp, signature)) {
      console.error("[WEBHOOK] Invalid Bachs signature");
      await logSecurityEvent(prisma, {
        eventType: "webhook_invalid_signature",
        severity: "warning",
        ipAddress,
        description: "Rejected Bachs webhook with invalid HMAC or stale timestamp",
        metadata: { timestamp: timestamp?.slice(0, 20) },
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let event: BachsEvent;
    try {
      event = JSON.parse(rawBody) as BachsEvent;
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!event?.id || !event?.type) {
      return NextResponse.json({ error: "Missing event fields" }, { status: 400 });
    }

    const expectedOrg = process.env.BACHS_ORG_ID;
    if (expectedOrg && event.organization_id && event.organization_id !== expectedOrg) {
      await logSecurityEvent(prisma, {
        eventType: "webhook_org_mismatch",
        severity: "warning",
        ipAddress,
        description: "Webhook organization_id did not match BACHS_ORG_ID",
        metadata: { eventId: event.id, type: event.type },
      });
      return NextResponse.json({ error: "Invalid organization" }, { status: 401 });
    }

    try {
      const existingEvent = await prisma.webhookEvent.findUnique({ where: { id: event.id } });
      if (existingEvent) {
        return NextResponse.json({ message: "Already processed" });
      }
    } catch {
      // continue
    }

    const checkoutId = event.data?.checkout_id;
    const reference = event.data?.reference;
    const type = event.type;

    if (type === "collection.failed" || type === "checkout.expired") {
      const order = reference
        ? await prisma.order.findUnique({ where: { txRef: reference } })
        : checkoutId
          ? await prisma.order.findUnique({ where: { checkoutId } })
          : null;

      if (order && !order.paymentVerified) {
        await logPayment(prisma, {
          orderId: order.id,
          txRef: order.txRef,
          flwRef: checkoutId || event.data?.charge_id || null,
          status: `webhook:${type}`,
          webhookData: JSON.stringify({ id: event.id, type, status: event.data?.status }),
          ipAddress,
        });
      }

      await prisma.webhookEvent.create({ data: { id: event.id, type: event.type, orderId: order?.id } }).catch(() => {});
      return NextResponse.json({ message: "Event recorded" });
    }

    if (type === "collection.underpaid") {
      await logSecurityEvent(prisma, {
        eventType: "payment_underpaid",
        severity: "warning",
        ipAddress,
        description: "Bachs reported an underpaid collection; order was not fulfilled",
        metadata: { eventId: event.id, checkoutId, reference },
      });
      await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } }).catch(() => {});
      return NextResponse.json({ message: "Underpaid ignored" });
    }

    if (type !== "collection.succeeded" && type !== "checkout.completed") {
      await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } }).catch(() => {});
      return NextResponse.json({ message: "Event ignored" });
    }

    if (!checkoutId || !isValidCheckoutId(checkoutId)) {
      await logPayment(prisma, {
        txRef: reference || null,
        status: "webhook:missing_checkout_id",
        webhookData: JSON.stringify({ id: event.id, type }),
        ipAddress,
      });
      return NextResponse.json({ message: "Missing checkout id" });
    }

    const order =
      (await prisma.order.findUnique({ where: { checkoutId } })) ||
      (reference ? await prisma.order.findUnique({ where: { txRef: reference } }) : null);

    if (!order) {
      await logPayment(prisma, {
        txRef: reference || null,
        flwRef: checkoutId,
        status: "webhook:order_not_found",
        webhookData: JSON.stringify({ id: event.id, type }),
        ipAddress,
      });
      return NextResponse.json({ message: "Order not found" });
    }

    await prisma.webhookEvent.create({
      data: { id: event.id, type: event.type, orderId: order.id },
    }).catch(() => {});

    if (order.paymentVerified) {
      return NextResponse.json({ message: "Already verified" });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.VERIFYING },
    });

    const result = await verifyAndFulfillOrder({
      prisma,
      order,
      checkoutId,
      ipAddress,
      verifiedBy: "webhook",
      requireCheckoutMatch: Boolean(order.checkoutId),
    });

    if (!result.ok) {
      await logPayment(prisma, {
        orderId: order.id,
        txRef: order.txRef,
        flwRef: checkoutId,
        status: `webhook:failed:${result.reason}`,
        webhookData: JSON.stringify({ id: event.id, type, reason: result.reason }),
        ipAddress,
      });
      if (result.reason === "still_open") {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PROCESSING },
        });
      }
    }

    return NextResponse.json({ message: "Webhook processed" });
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return NextResponse.json({ message: "Webhook error" }, { status: 500 });
  }
}
