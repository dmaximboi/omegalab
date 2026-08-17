import crypto from "crypto";
import type { BachsWebhookEvent } from "./types";

const SIGNATURE_TOLERANCE_SECONDS = 300;

export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyBachsWebhookSignature(
  rawBody: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  secret = process.env.BACHS_WEBHOOK_SECRET,
  toleranceSeconds = SIGNATURE_TOLERANCE_SECONDS
): boolean {
  if (!secret || !timestampHeader || !signatureHeader || !rawBody) return false;

  const timestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  return timingSafeEqualString(expected, signatureHeader);
}

export function parseBachsWebhookEvent(body: string): BachsWebhookEvent | null {
  try {
    const parsed = JSON.parse(body) as BachsWebhookEvent;
    if (!parsed?.id || !parsed?.type || typeof parsed.data !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isCollectionSucceeded(event: BachsWebhookEvent): boolean {
  const typeOk = event.type === "collection.succeeded" || event.type === "checkout.completed";
  const status = String(event.data?.status || "").toLowerCase();
  const statusOk = !status || status === "succeeded" || status === "successful" || status === "completed";
  return typeOk && statusOk;
}
