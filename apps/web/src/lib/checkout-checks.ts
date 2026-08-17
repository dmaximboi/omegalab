import Decimal from "decimal.js";
import type { BachsCheckoutSession } from "./bachs";

const SUCCESS_PAYMENT_STATUSES = new Set(["succeeded", "successful", "completed", "paid"]);
const COMPLETED_SESSION_STATUSES = new Set(["completed", "complete"]);

export function normalizeStatus(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

export interface ExpectedCheckout {
  txRef: string;
  paymentAmount: string | number;
  paymentCurrency: string;
  orderId: string;
}

export function evaluateCheckout(session: BachsCheckoutSession, expected: ExpectedCheckout) {
  const status = normalizeStatus(session.status);
  const paymentStatus = normalizeStatus(session.payment_status || session.charge?.status);

  const paidAmountRaw = session.amount ?? session.charge?.amount;
  let paidAmount: Decimal;
  try {
    paidAmount = new Decimal(paidAmountRaw == null ? "0" : paidAmountRaw.toString());
  } catch {
    paidAmount = new Decimal(0);
  }

  const expectedAmount = new Decimal(expected.paymentAmount.toString());
  const paidCurrency = normalizeStatus(session.currency || session.charge?.currency);
  const expectedCurrency = expected.paymentCurrency.trim().toLowerCase();

  return {
    sessionOpen: status === "open",
    isSuccess: COMPLETED_SESSION_STATUSES.has(status) && SUCCESS_PAYMENT_STATUSES.has(paymentStatus),
    txRefMatch: Boolean(session.reference) && session.reference === expected.txRef,
    amountOk: paidAmount.gt(0) && paidAmount.gte(expectedAmount),
    currencyOk: Boolean(paidCurrency) && paidCurrency === expectedCurrency,
    orderIdMatch: session.metadata?.order_id === expected.orderId,
    paidAmount,
  };
}
