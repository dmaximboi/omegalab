import { PrismaClient, OrderStatus } from "@prisma/client";
import { getCheckoutSession, isValidCheckoutId, type BachsCheckoutSession } from "@/lib/bachs";
import { timingSafeEqualString } from "@/lib/payment";
import { evaluateCheckout } from "@/lib/checkout-checks";

export { evaluateCheckout } from "@/lib/checkout-checks";

type PrismaLike = PrismaClient;

export interface FulfillResult {
  ok: boolean;
  alreadyPaid?: boolean;
  reason?: string;
  amount?: number;
}

function summarizeSession(session: BachsCheckoutSession) {
  return {
    checkout_id: session.checkout_id,
    status: session.status,
    payment_status: session.payment_status ?? null,
    amount: session.amount ?? null,
    currency: session.currency ?? null,
    reference: session.reference ?? null,
    order_id: session.metadata?.order_id ?? null,
    charge_id: session.charge?.payment_id ?? null,
    charge_status: session.charge?.status ?? null,
  };
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
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
    paymentAmount?: { toString(): string } | null;
    paymentCurrency?: string | null;
    orderCurrency?: string | null;
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
      providerRef: checkoutId,
      status: "step:VERIFY_REJECTED:checkout_mismatch",
      ipAddress,
    });
    return { ok: false, reason: "checkout_mismatch" };
  }

  if (order.paymentVerified) {
    return { ok: true, alreadyPaid: true };
  }

  if (!order.paymentAmount || !order.paymentCurrency) {
    await logPayment(prisma, {
      orderId: order.id,
      txRef: order.txRef,
      providerRef: checkoutId,
      status: "step:VERIFY_REJECTED:missing_fx_quote",
      ipAddress,
    });
    return { ok: false, reason: "missing_fx_quote" };
  }

  const session = await getCheckoutSession(checkoutId);
  if (!session) {
    await logPayment(prisma, {
      orderId: order.id,
      txRef: order.txRef,
      providerRef: checkoutId,
      status: "step:VERIFY_REJECTED:session_not_found",
      ipAddress,
    });
    return { ok: false, reason: "session_not_found" };
  }

  const paymentCurrency = order.paymentCurrency.toUpperCase();
  const checks = evaluateCheckout(session, {
    txRef: order.txRef,
    paymentAmount: order.paymentAmount.toString(),
    paymentCurrency,
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
      providerRef: checkoutId,
      status: `step:VERIFY_REJECTED:${failReason}`,
      responseData: JSON.stringify(summarizeSession(session)),
      ipAddress,
    });
    return { ok: false, reason: failReason };
  }

  const chargeId = session.charge?.payment_id || checkoutId;
  const paidUsd = checks.paidAmount.toNumber();
  const orderNgn = Number(order.totalAmount.toString());
  const orderCurrency = (order.orderCurrency || "NGN").toUpperCase();

  const updated = await prisma.order.updateMany({
    where: { id: order.id, paymentVerified: false },
    data: {
      status: OrderStatus.PAID,
      paymentVerified: true,
      providerRef: chargeId,
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
    providerRef: chargeId,
    amount: paidUsd,
    status: "step:PAID",
    responseData: JSON.stringify({
      checkoutId,
      orderCurrency,
      orderAmountNgn: orderNgn,
      paymentCurrency,
      paymentAmountUsd: paidUsd,
      verifiedBy,
    }),
    ipAddress,
  });

  try {
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: "order_success",
        title: "Payment Successful! ✓",
        body: `Your order #${order.txRef} has been confirmed. Total: ${formatMoney(orderNgn, orderCurrency)} (collected ${formatMoney(paidUsd, paymentCurrency)}). Your receipt is ready. [orderId:${order.id}]`,
      },
    });
  } catch (err) {
    console.error("[NOTIFICATION] Failed to create:", err);
  }

  return { ok: true, amount: paidUsd };
}

export async function logPayment(
  prisma: PrismaLike,
  data: {
    orderId?: string | null;
    txRef?: string | null;
    providerRef?: string | null;
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
        providerRef: data.providerRef || null,
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
