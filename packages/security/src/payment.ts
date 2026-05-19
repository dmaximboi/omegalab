// ============================================
// PAYMENT SECURITY MODULE - 10 Security Functions
// ============================================
import crypto from "crypto";

// 1. Generate Transaction Hash
export function generateTransactionHash(txRef: string, amount: number, currency: string, secret: string): string {
  const data = `${txRef}|${amount}|${currency}`;
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

// 2. Verify Transaction Hash
export function verifyTransactionHash(txRef: string, amount: number, currency: string, secret: string, hash: string): boolean {
  const expected = generateTransactionHash(txRef, amount, currency, secret);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}

// 3. Validate Amount
export function isValidAmount(amount: number, minAmount: number = 100, maxAmount: number = 10000000): boolean {
  if (typeof amount !== "number" || isNaN(amount)) return false;
  if (amount < minAmount || amount > maxAmount) return false;
  if (!Number.isFinite(amount)) return false;
  const decimals = (amount.toString().split(".")[1] || "").length;
  return decimals <= 2;
}

// 4. Verify Flutterwave Webhook Signature
export function verifyFlutterwaveSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// 5. Generate Idempotency Key
export function generateIdempotencyKey(userId: string, action: string, data: string): string {
  const input = `${userId}:${action}:${data}:${Date.now()}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

// 6. Check Replay Attack (timestamp validation)
export function isReplayAttack(timestamp: number, maxAgeSeconds: number = 300): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff > maxAgeSeconds * 1000;
}

// 7. Fraud Detection Score
export interface FraudSignals {
  ipMismatch: boolean;
  unusualAmount: boolean;
  rapidTransactions: boolean;
  newAccount: boolean;
  differentDevice: boolean;
}

export function calculateFraudScore(signals: FraudSignals): number {
  let score = 0;
  if (signals.ipMismatch) score += 25;
  if (signals.unusualAmount) score += 20;
  if (signals.rapidTransactions) score += 30;
  if (signals.newAccount) score += 15;
  if (signals.differentDevice) score += 10;
  return Math.min(score, 100);
}

// 8. Generate Payment Receipt Hash
export function generatePaymentReceiptHash(orderId: string, userId: string, amount: string, salt: string): string {
  return crypto.createHash("sha256").update(`${orderId}:${userId}:${amount}:${salt}`).digest("hex");
}

// 9. Verify Receipt Integrity
export function verifyReceiptIntegrity(orderId: string, userId: string, amount: string, salt: string, hash: string): boolean {
  const expected = generatePaymentReceiptHash(orderId, userId, amount, salt);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}

// 10. Validate Currency
const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR"];
export function isValidCurrency(currency: string): boolean {
  return SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
}

// 11. Refund Guard (check if refund is allowed)
export function canRefund(orderStatus: string, paymentVerified: boolean, createdAt: Date, maxRefundDays: number = 7): boolean {
  if (orderStatus !== "PAID") return false;
  if (!paymentVerified) return false;
  const daysSinceOrder = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceOrder <= maxRefundDays;
}

// 12. Payment Log Entry
export interface PaymentLogEntry {
  txRef: string;
  amount: number;
  currency: string;
  status: string;
  timestamp: Date;
  ipAddress: string;
  userId?: string;
}

export function createPaymentLog(entry: PaymentLogEntry): string {
  return JSON.stringify({
    ...entry,
    timestamp: entry.timestamp.toISOString(),
    hash: crypto.createHash("sha256").update(JSON.stringify(entry)).digest("hex").slice(0, 16),
  });
}
