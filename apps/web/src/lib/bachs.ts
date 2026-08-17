import crypto from "crypto";
import Decimal from "decimal.js";

export interface PaymentInitiation {
  txRef: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentResponse {
  status: "success" | "error";
  message: string;
  data?: {
    checkoutUrl: string;
    checkoutId: string;
    txRef: string;
  };
}

export interface BachsCheckoutSession {
  checkout_id: string;
  checkout_url?: string;
  status: string;
  payment_status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  reference?: string | null;
  metadata?: Record<string, string> | null;
  charge?: {
    payment_id?: string;
    status?: string;
    amount?: string;
    currency?: string;
  } | null;
  customer?: {
    email?: string;
    name?: string;
  } | null;
}

export function formatMoney(amount: number | string): string {
  return new Decimal(amount.toString()).toFixed(2);
}

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

export function isValidCheckoutId(checkoutId: string): boolean {
  return /^[A-Za-z0-9_-]{8,80}$/.test(checkoutId);
}

function isTrustedCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "checkout.bachs.io" || host === "sandbox-checkout.bachs.io" || host.endsWith(".checkout.bachs.io");
  } catch {
    return false;
  }
}

export function verifyBachsWebhookSignature(
  rawBody: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  secret = process.env.BACHS_WEBHOOK_SECRET,
  toleranceSeconds = 300
): boolean {
  if (!secret || !timestampHeader || !signatureHeader || !rawBody) return false;

  const timestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const bufA = Buffer.from(expected);
  const bufB = Buffer.from(signatureHeader);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
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

    if (!isTrustedCheckoutUrl(checkoutUrl)) {
      return { status: "error", message: "Payment provider returned an unexpected checkout URL" };
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

export async function getCheckoutSession(checkoutId: string): Promise<BachsCheckoutSession | null> {
  if (!isValidCheckoutId(checkoutId)) return null;

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

