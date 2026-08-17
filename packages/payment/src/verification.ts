import Decimal from "decimal.js";
import type { BachsCheckoutSession, PaymentVerification } from "./types";

const EXPECTED_CURRENCY = (process.env.PAYMENT_CURRENCY || "USD").toUpperCase();

export interface CheckoutSecurityChecks {
  sessionOpen: boolean;
  isSuccess: boolean;
  txRefMatch: boolean;
  amountOk: boolean;
  currencyOk: boolean;
  orderIdMatch: boolean;
  paidAmount: Decimal;
}

export function normalizeStatus(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

export function evaluateCheckout(
  session: BachsCheckoutSession,
  expected: { txRef: string; amount: string | number; orderId: string }
): CheckoutSecurityChecks {
  const status = normalizeStatus(session.status);
  const paymentStatus = normalizeStatus(session.payment_status || session.charge?.status);
  const isSuccess =
    (status === "completed" || status === "complete") &&
    (paymentStatus === "succeeded" || paymentStatus === "successful" || paymentStatus === "completed" || paymentStatus === "");

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

export function checkoutToVerification(session: BachsCheckoutSession): PaymentVerification {
  const checksPass =
    normalizeStatus(session.status) === "completed" &&
    ["succeeded", "successful", "completed", ""].includes(normalizeStatus(session.payment_status || session.charge?.status));

  return {
    checkoutId: session.checkout_id,
    chargeId: session.charge?.payment_id,
    txRef: session.reference || "",
    amount: String(session.amount ?? "0"),
    currency: String(session.currency || "").toUpperCase(),
    status: checksPass ? "successful" : normalizeStatus(session.status) === "open" ? "pending" : "failed",
    paymentStatus: session.payment_status || session.status,
    customerEmail: session.customer?.email || "",
    metadata: session.metadata || undefined,
  };
}

export function validatePaymentAmount(expected: number, actual: number, tolerance = 0.01): boolean {
  const diff = Math.abs(expected - actual);
  return diff <= tolerance * expected;
}

export function isPaymentSuccessful(verification: PaymentVerification | null): boolean {
  return verification?.status === "successful";
}
