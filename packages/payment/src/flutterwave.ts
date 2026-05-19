// ============================================
// Flutterwave Payment Integration
// ============================================

import type { PaymentInitiation, PaymentResponse } from "./types";

const FLW_BASE_URL = "https://api.flutterwave.com/v3";

function getSecretKey(): string {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new Error("FLW_SECRET_KEY not configured");
  return key;
}

export async function initiatePayment(data: PaymentInitiation): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${FLW_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getSecretKey()}`,
      },
      body: JSON.stringify({
        tx_ref: data.txRef,
        amount: data.amount,
        currency: data.currency,
        redirect_url: data.redirectUrl,
        customer: {
          email: data.customerEmail,
          name: data.customerName,
          phonenumber: data.customerPhone,
        },
        customizations: {
          title: "De-Omega Labaffairs",
          description: "Payment for laboratory equipment",
          logo: "https://omegalabaffairs.com/logo.png",
        },
        meta: data.meta,
      }),
    });

    const result = await response.json();

    if (result.status === "success") {
      return {
        status: "success",
        message: "Payment initiated",
        data: {
          link: result.data.link,
          txRef: data.txRef,
        },
      };
    }

    return {
      status: "error",
      message: result.message || "Payment initiation failed",
    };
  } catch {
    return {
      status: "error",
      message: "Could not connect to payment provider",
    };
  }
}

export function generatePaymentLink(txRef: string, amount: number, email: string, redirectUrl: string): string {
  const publicKey = process.env.FLW_PUBLIC_KEY;
  if (!publicKey) throw new Error("FLW_PUBLIC_KEY not configured");
  
  const params = new URLSearchParams({
    public_key: publicKey,
    tx_ref: txRef,
    amount: amount.toString(),
    currency: "NGN",
    customer_email: email,
    redirect_url: redirectUrl,
  });

  return `https://checkout.flutterwave.com/v3/hosted/pay?${params.toString()}`;
}
