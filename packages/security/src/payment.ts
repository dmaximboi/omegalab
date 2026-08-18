import crypto from "crypto";

function safeEqualHex(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided || "", "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function generateTransactionHash(
  txRef: string,
  amount: number,
  currency: string,
  secret: string
): string {
  const data = `${txRef}|${amount}|${currency}`;
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

export function verifyTransactionHash(
  txRef: string,
  amount: number,
  currency: string,
  secret: string,
  hash: string
): boolean {
  const expected = generateTransactionHash(txRef, amount, currency, secret);
  return safeEqualHex(expected, hash);
}

export function isValidAmount(
  amount: number,
  minAmount: number = 100,
  maxAmount: number = 10000000
): boolean {
  if (typeof amount !== "number" || isNaN(amount)) return false;
  if (amount < minAmount || amount > maxAmount) return false;
  if (!Number.isFinite(amount)) return false;
  const decimals = (amount.toString().split(".")[1] || "").length;
  return decimals <= 2;
}

export function verifyBachsSignature(
  rawBody: string,
  timestampHeader: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300
): boolean {
  const timestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp) || !rawBody || !signatureHeader || !secret) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return safeEqualHex(expected, signatureHeader);
}

export function generatePaymentReceiptHash(
  orderId: string,
  userId: string,
  amount: string,
  salt: string
): string {
  return crypto.createHash("sha256").update(`${orderId}:${userId}:${amount}:${salt}`).digest("hex");
}

export function verifyReceiptIntegrity(
  orderId: string,
  userId: string,
  amount: string,
  salt: string,
  hash: string
): boolean {
  const expected = generatePaymentReceiptHash(orderId, userId, amount, salt);
  return safeEqualHex(expected, hash);
}

const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR"];

export function isValidCurrency(currency: string): boolean {
  return SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
}
