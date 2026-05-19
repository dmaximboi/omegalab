// ============================================
// Webhook Handler
// ============================================

import crypto from "crypto";
import type { WebhookPayload } from "./types";

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.FLW_WEBHOOK_SECRET;
  if (!secret) {
    console.error("FLW_WEBHOOK_SECRET not configured");
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function parseWebhookPayload(body: string): WebhookPayload | null {
  try {
    const parsed = JSON.parse(body);
    
    if (!parsed.event || !parsed.data) {
      return null;
    }

    return parsed as WebhookPayload;
  } catch {
    return null;
  }
}

export function isChargeCompleted(payload: WebhookPayload): boolean {
  return payload.event === "charge.completed" && payload.data.status === "successful";
}

export function extractTransactionDetails(payload: WebhookPayload): {
  txRef: string;
  flwRef: string;
  amount: number;
  currency: string;
  email: string;
} {
  return {
    txRef: payload.data.tx_ref,
    flwRef: payload.data.flw_ref,
    amount: payload.data.amount,
    currency: payload.data.currency,
    email: payload.data.customer.email,
  };
}

export function validateWebhookTimestamp(timestamp: string, maxAgeSeconds: number = 300): boolean {
  const webhookTime = new Date(timestamp).getTime();
  const now = Date.now();
  return Math.abs(now - webhookTime) <= maxAgeSeconds * 1000;
}
