import { PrismaClient, OrderStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { getCheckoutSession, isValidCheckoutId, type BachsCheckoutSession } from "@/lib/bachs";
import { timingSafeEqualString } from "@/lib/payment";

const EXPECTED_CURRENCY = (process.env.PAYMENT_CURRENCY || "NGN").toUpperCase();

type PrismaLike = PrismaClient;

export interface FulfillResult {
  ok: boolean;
  alreadyPaid?: boolean;
  reason?: string;
  amount?: number;
}

function normalizeStatus(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

export function evaluateCheckout(
  session: BachsCheckoutSession,
  expected: { txRef: string; amount: string | number; orderId: string }
) {
  const status = normalizeStatus(session.status);
  const paymentStatus = normalizeStatus(session.payment_status || session.charge?.status);
  const isSuccess =
    (status === "completed" || status === "complete") &&
    (paymentStatus === "succeeded" ||
      paymentStatus === "successful" ||
      paymentStatus === "completed" ||
      (paymentStatus === "" && Boolean(session.charge?.payment_id)));

  const paidAmount = new Decimal(session.amount ?? session.charge?.amount ?? "0");
  const dbAmount = new Decimal(expected.amount.toString());
  const metaOrderId = session.metadata?.order_id;

  return {
    sessionOpen: status === "open",
    isSuccess,
    txRefMatch: session.reference === expected.txRef,
    amountOk: paidAmount.gte(dbAmount),
    currencyOk: normalizeStatus(session.currency || session.charge?.currency) === EXPECTED_CURRENCY.toLowerCase(),
    orderIdMatch: !metaOrderId || metaOrderId === expected.orderId,
    paidAmount,
  };
}

export async function verifyAndFulfillOrder(opts: {
  prisma: PrismaLike;
  order: {
    id: string;
    txRef: string;
    totalAmount: { toString(): string };
    paymentVerified: boolean;
    checkoutId?: string | null;
    userId: string;
  };
  checkoutId: string;
  ipAddress?: string;
  verifiedBy: "callback" | "webhook";
  requireCheckoutMatch?: boolean;
}): Promise<FulfillResult> {
  const { prisma, order, checkoutId, ipAddress, verifiedBy, requireCheckoutMatch = true } = opts;

  if (!isValidCheckoutId(checkoutId)) {
    return { ok: false, reason: "invalid_checkout_id" };
  }

  if (requireCheckoutMatch && order.checkoutId && !timingSafeEqualString(order.checkoutId, checkoutId)) {
    await logPayment(prisma, {
      orderId: order.id,
      txRef: order.txRef,
      flwRef: checkoutId,
      status: "step:VERIFY_REJECTED:checkout_mismatch",
      ipAddress,
    });
    return { ok: false, reason: "checkout_mismatch" };
  }

  if (order.paymentVerified) {
    return { ok: true, alreadyPaid: true };
  }

  const session = await getCheckoutSession(checkoutId);
  if (!session) {
    await logPayment(prisma, {
      orderId: order.id,
      txRef: order.txRef,
      flwRef: checkoutId,
      status: "step:VERIFY_REJECTED:session_not_found",
      ipAddress,
    });
    return { ok: false, reason: "session_not_found" };
  }

  const checks = evaluateCheckout(session, {
    txRef: order.txRef,
    amount: order.totalAmount.toString(),
    orderId: order.id,
  });

  if (checks.sessionOpen) {
    return { ok: false, reason: "still_open" };
  }

  if (!(checks.isSuccess && checks.txRefMatch && checks.amountOk && checks.currencyOk && checks.orderIdMatch)) {
    const failReason = !checks.isSuccess
      ? "not_success"
      : !checks.txRefMatch
        ? "txref_mismatch"
        : !checks.amountOk
          ? "amount_mismatch"
          : !checks.currencyOk
            ? "currency_mismatch"
            : "order_mismatch";

    await logPayment(prisma, {
      orderId: order.id,
      txRef: order.txRef,
      flwRef: checkoutId,
      status: `step:VERIFY_REJECTED:${failReason}`,
      responseData: JSON.stringify(session),
      ipAddress,
    });
    return { ok: false, reason: failReason };
  }

  const chargeId = session.charge?.payment_id || checkoutId;
  const paid = checks.paidAmount.toNumber();

  const updated = await prisma.order.updateMany({
    where: { id: order.id, paymentVerified: false },
    data: {
      status: OrderStatus.PAID,
      paymentVerified: true,
      flwRef: chargeId,
      checkoutId,
      verifiedAt: new Date(),
      verifiedBy,
    },
  });

  if (updated.count === 0) {
    return { ok: true, alreadyPaid: true };
  }

  await logPayment(prisma, {
    orderId: order.id,
    txRef: order.txRef,
    flwRef: chargeId,
    amount: paid,
    status: "step:PAID",
    responseData: JSON.stringify({ checkoutId, currency: EXPECTED_CURRENCY, verifiedBy }),
    ipAddress,
  });

  try {
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: "order_success",
        title: "Payment Successful! ✓",
        body: `Your order #${order.txRef} has been confirmed. Total: ₦${paid.toLocaleString()}. Your receipt is ready. [orderId:${order.id}]`,
      },
    });
  } catch (err) {
    console.error("[NOTIFICATION] Failed to create:", err);
  }

  return { ok: true, amount: paid };
}

export async function logPayment(
  prisma: PrismaLike,
  data: {
    orderId?: string | null;
    txRef?: string | null;
    flwRef?: string | null;
    amount?: number;
    status: string;
    responseCode?: string;
    responseData?: string;
    webhookData?: string;
    ipAddress?: string;
  }
) {
  try {
    await prisma.paymentLog.create({
      data: {
        orderId: data.orderId || null,
        txRef: data.txRef || null,
        flwRef: data.flwRef || null,
        amount: data.amount ?? null,
        status: data.status,
        responseCode: data.responseCode || null,
        responseData: data.responseData || null,
        webhookData: data.webhookData || null,
        ipAddress: data.ipAddress || null,
      },
    });
  } catch (logErr) {
    console.error("[PAYMENT LOG] Failed to write log:", logErr);
  }
}

export async function logSecurityEvent(
  prisma: PrismaLike,
  data: {
    eventType: string;
    severity: string;
    ipAddress?: string;
    description: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await prisma.securityEvent.create({
      data: {
        eventType: data.eventType,
        severity: data.severity,
        ipAddress: data.ipAddress,
        description: data.description,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  } catch {
    // non-blocking
  }
}

export { EXPECTED_CURRENCY };
