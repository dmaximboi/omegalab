import crypto from "crypto";

// Flutterwave payment verification (server-side)
export async function verifyFlutterwavePayment(transactionId: string) {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) throw new Error("FLW_SECRET_KEY not configured");

  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();
  return data;
}

// Cryptographically secure tx ref
export function generateTxRef(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `OMEGA-${timestamp}-${randomPart}`;
}

// HMAC-based receipt hash with per-order salt
export function generateReceiptHash(orderId: string, txRef: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const secret = process.env.FLW_SECRET_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("FLW_SECRET_KEY or NEXTAUTH_SECRET must be configured for receipt hashing");
  const hash = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}:${txRef}:${salt}`)
    .digest("hex");
  return { hash, salt };
}

// Verify a receipt hash
export function verifyReceiptHash(orderId: string, txRef: string, salt: string, hash: string): boolean {
  const secret = process.env.FLW_SECRET_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("FLW_SECRET_KEY or NEXTAUTH_SECRET must be configured for receipt verification");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}:${txRef}:${salt}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}

// Validate Flutterwave webhook signature
export function verifyWebhookSignature(signature: string | null): boolean {
  const webhookSecret = process.env.FLW_WEBHOOK_SECRET;
  if (!webhookSecret || !signature) return false;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(webhookSecret)
  );
}
