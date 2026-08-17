import type { BachsCheckoutSession, PaymentInitiation, PaymentResponse } from "./types";

const SANDBOX_BASE = "https://sandbox-api.bachs.io";
const LIVE_BASE = "https://api.bachs.io";

export function getBachsApiKey(): string {
  const key = process.env.BACHS_API_KEY;
  if (!key) throw new Error("BACHS_API_KEY not configured");
  return key;
}

export function getBachsBaseUrl(): string {
  const key = process.env.BACHS_API_KEY || "";
  const mode = (process.env.BACHS_MODE || "").toLowerCase();
  if (mode === "live" || key.startsWith("sk_live_")) return LIVE_BASE;
  if (mode === "sandbox" || key.startsWith("sk_sandbox_")) return SANDBOX_BASE;
  throw new Error("BACHS_API_KEY must start with sk_sandbox_ or sk_live_, or set BACHS_MODE");
}

function bachsHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${getBachsApiKey()}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extra,
  };
}

export function formatMoney(amount: number | string): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return n.toFixed(2);
}

export async function createCheckoutSession(
  data: PaymentInitiation,
  idempotencyKey: string
): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${getBachsBaseUrl()}/v1/checkout-sessions`, {
      method: "POST",
      headers: bachsHeaders({ "Idempotency-Key": idempotencyKey.slice(0, 128) }),
      body: JSON.stringify({
        customer: {
          email: data.customerEmail,
          name: data.customerName,
          ...(data.customerPhone ? { phone_number: data.customerPhone } : {}),
        },
        pricing: {
          currency: data.currency,
          amount: formatMoney(data.amount),
          price_type: "fixed",
        },
        reference: data.txRef,
        metadata: data.metadata || {},
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        expires_in_minutes: 60,
        allowed_payment_method_types: ["card", "bank_transfer", "mobile_money"],
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        status: "error",
        message: result.detail || result.message || "Checkout session creation failed",
      };
    }

    const checkoutUrl = result.checkout_url as string | undefined;
    const checkoutId = result.checkout_id as string | undefined;
    if (!checkoutUrl || !checkoutId) {
      return { status: "error", message: "Payment provider returned an incomplete session" };
    }

    return {
      status: "success",
      message: "Checkout session created",
      data: { checkoutUrl, checkoutId, txRef: data.txRef },
    };
  } catch {
    return { status: "error", message: "Could not connect to payment provider" };
  }
}

export function isValidCheckoutId(checkoutId: string): boolean {
  return /^[A-Za-z0-9_-]{8,80}$/.test(checkoutId);
}

export async function getCheckoutSession(checkoutId: string): Promise<BachsCheckoutSession | null> {
  if (!isValidCheckoutId(checkoutId)) {
    return null;
  }

  try {
    const response = await fetch(
      `${getBachsBaseUrl()}/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`,
      { method: "GET", headers: bachsHeaders() }
    );
    if (!response.ok) return null;
    const json = await response.json();
    const session = json?.checkout_id ? json : json?.data;
    return (session as BachsCheckoutSession) || null;
  } catch {
    return null;
  }
}
