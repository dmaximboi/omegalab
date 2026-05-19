// ============================================
// Payment Verification
// ============================================

import type { PaymentVerification } from "./types";

const FLW_BASE_URL = "https://api.flutterwave.com/v3";

function getSecretKey(): string {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new Error("FLW_SECRET_KEY not configured");
  return key;
}

export async function verifyPaymentByTxRef(txRef: string): Promise<PaymentVerification | null> {
  try {
    const response = await fetch(
      `${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${getSecretKey()}`,
        },
      }
    );

    const result = await response.json();

    if (result.status !== "success" || !result.data) {
      return null;
    }

    const data = result.data;
    return {
      txRef: data.tx_ref,
      flwRef: data.flw_ref,
      amount: data.amount,
      currency: data.currency,
      status: data.status === "successful" ? "successful" : data.status === "failed" ? "failed" : "pending",
      chargedAmount: data.charged_amount,
      customerEmail: data.customer?.email || "",
      paymentType: data.payment_type,
      createdAt: data.created_at,
    };
  } catch {
    return null;
  }
}

export async function verifyPaymentById(transactionId: number): Promise<PaymentVerification | null> {
  try {
    const response = await fetch(
      `${FLW_BASE_URL}/transactions/${transactionId}/verify`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${getSecretKey()}`,
        },
      }
    );

    const result = await response.json();

    if (result.status !== "success" || !result.data) {
      return null;
    }

    const data = result.data;
    return {
      txRef: data.tx_ref,
      flwRef: data.flw_ref,
      amount: data.amount,
      currency: data.currency,
      status: data.status === "successful" ? "successful" : data.status === "failed" ? "failed" : "pending",
      chargedAmount: data.charged_amount,
      customerEmail: data.customer?.email || "",
      paymentType: data.payment_type,
      createdAt: data.created_at,
    };
  } catch {
    return null;
  }
}

export function validatePaymentAmount(expected: number, actual: number, tolerance: number = 0.01): boolean {
  const diff = Math.abs(expected - actual);
  return diff <= tolerance * expected;
}

export function isPaymentSuccessful(verification: PaymentVerification | null): boolean {
  return verification?.status === "successful";
}
