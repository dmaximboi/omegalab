import Decimal from "decimal.js";
import type { BachsCheckoutSession } from "./bachs";

export function normalizeStatus(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

export function evaluateCheckout(
  session: BachsCheckoutSession,
  expected: {
    txRef: string;
    /** Amount sent to Bachs (locked USD payment amount) */
    paymentAmount: string | number;
    paymentCurrency: string;
    orderId: string;
  }
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
  const expectedAmount = new Decimal(expected.paymentAmount.toString());
  const metaOrderId = session.metadata?.order_id;
  const paidCurrency = normalizeStatus(session.currency || session.charge?.currency);
  const expectedCurrency = expected.paymentCurrency.toLowerCase();

  return {
    sessionOpen: status === "open",
    isSuccess,
    txRefMatch: session.reference === expected.txRef,
    amountOk: paidAmount.gte(expectedAmount),
    currencyOk: paidCurrency === expectedCurrency,
    orderIdMatch: !metaOrderId || metaOrderId === expected.orderId,
    paidAmount,
  };
}
