"use strict";
// ============================================
// Webhook Handler
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.parseWebhookPayload = parseWebhookPayload;
exports.isChargeCompleted = isChargeCompleted;
exports.extractTransactionDetails = extractTransactionDetails;
exports.validateWebhookTimestamp = validateWebhookTimestamp;
const crypto_1 = __importDefault(require("crypto"));
function verifyWebhookSignature(payload, signature) {
    const secret = process.env.FLW_WEBHOOK_SECRET;
    if (!secret) {
        console.error("FLW_WEBHOOK_SECRET not configured");
        return false;
    }
    const expected = crypto_1.default.createHmac("sha256", secret).update(payload).digest("hex");
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    }
    catch {
        return false;
    }
}
function parseWebhookPayload(body) {
    try {
        const parsed = JSON.parse(body);
        if (!parsed.event || !parsed.data) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
function isChargeCompleted(payload) {
    return payload.event === "charge.completed" && payload.data.status === "successful";
}
function extractTransactionDetails(payload) {
    return {
        txRef: payload.data.tx_ref,
        flwRef: payload.data.flw_ref,
        amount: payload.data.amount,
        currency: payload.data.currency,
        email: payload.data.customer.email,
    };
}
function validateWebhookTimestamp(timestamp, maxAgeSeconds = 300) {
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    return Math.abs(now - webhookTime) <= maxAgeSeconds * 1000;
}
