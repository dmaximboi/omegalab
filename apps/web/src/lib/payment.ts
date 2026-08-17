import crypto from "crypto";

export function generateTxRef(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `OMEGA-${timestamp}-${randomPart}`;
}

function receiptSecret(): string {
  const secret = process.env.RECEIPT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("RECEIPT_SECRET or NEXTAUTH_SECRET must be configured for receipt hashing");
  return secret;
}

export function generateReceiptHash(orderId: string, txRef: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHmac("sha256", receiptSecret()).update(`${orderId}:${txRef}:${salt}`).digest("hex");
  return { hash, salt };
}

export function verifyReceiptHash(orderId: string, txRef: string, salt: string, hash: string): boolean {
  if (!hash || !salt) return false;
  const expected = crypto.createHmac("sha256", receiptSecret()).update(`${orderId}:${txRef}:${salt}`).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(hash);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function timingSafeEqualString(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function getAppUrl(): string {
  const url = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL not configured");
  if (process.env.NODE_ENV === "production" && !url.startsWith("https://")) {
    throw new Error("NEXT_PUBLIC_APP_URL must use https in production");
  }
  return url;
}

export function normalizeNgPhone(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  if (digits.startsWith("234") && digits.length >= 13) return `+${digits}`;
  if (digits.startsWith("0") && digits.length >= 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}
