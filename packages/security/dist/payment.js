"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTransactionHash = generateTransactionHash;
exports.verifyTransactionHash = verifyTransactionHash;
exports.isValidAmount = isValidAmount;
exports.verifyFlutterwaveSignature = verifyFlutterwaveSignature;
exports.generateIdempotencyKey = generateIdempotencyKey;
exports.isReplayAttack = isReplayAttack;
exports.calculateFraudScore = calculateFraudScore;
exports.generatePaymentReceiptHash = generatePaymentReceiptHash;
exports.verifyReceiptIntegrity = verifyReceiptIntegrity;
exports.isValidCurrency = isValidCurrency;
exports.canRefund = canRefund;
exports.createPaymentLog = createPaymentLog;
// ============================================
// PAYMENT SECURITY MODULE - 10 Security Functions
// ============================================
const crypto_1 = __importDefault(require("crypto"));
// 1. Generate Transaction Hash
function generateTransactionHash(txRef, amount, currency, secret) {
    const data = `${txRef}|${amount}|${currency}`;
    return crypto_1.default.createHmac("sha256", secret).update(data).digest("hex");
}
// 2. Verify Transaction Hash
function verifyTransactionHash(txRef, amount, currency, secret, hash) {
    const expected = generateTransactionHash(txRef, amount, currency, secret);
    return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}
// 3. Validate Amount
function isValidAmount(amount, minAmount = 100, maxAmount = 10000000) {
    if (typeof amount !== "number" || isNaN(amount))
        return false;
    if (amount < minAmount || amount > maxAmount)
        return false;
    if (!Number.isFinite(amount))
        return false;
    const decimals = (amount.toString().split(".")[1] || "").length;
    return decimals <= 2;
}
// 4. Verify Flutterwave Webhook Signature
function verifyFlutterwaveSignature(payload, signature, secret) {
    const expected = crypto_1.default.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
// 5. Generate Idempotency Key
function generateIdempotencyKey(userId, action, data) {
    const input = `${userId}:${action}:${data}:${Date.now()}`;
    return crypto_1.default.createHash("sha256").update(input).digest("hex");
}
// 6. Check Replay Attack (timestamp validation)
function isReplayAttack(timestamp, maxAgeSeconds = 300) {
    const now = Date.now();
    const diff = Math.abs(now - timestamp);
    return diff > maxAgeSeconds * 1000;
}
function calculateFraudScore(signals) {
    let score = 0;
    if (signals.ipMismatch)
        score += 25;
    if (signals.unusualAmount)
        score += 20;
    if (signals.rapidTransactions)
        score += 30;
    if (signals.newAccount)
        score += 15;
    if (signals.differentDevice)
        score += 10;
    return Math.min(score, 100);
}
// 8. Generate Payment Receipt Hash
function generatePaymentReceiptHash(orderId, userId, amount, salt) {
    return crypto_1.default.createHash("sha256").update(`${orderId}:${userId}:${amount}:${salt}`).digest("hex");
}
// 9. Verify Receipt Integrity
function verifyReceiptIntegrity(orderId, userId, amount, salt, hash) {
    const expected = generatePaymentReceiptHash(orderId, userId, amount, salt);
    return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}
// 10. Validate Currency
const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR"];
function isValidCurrency(currency) {
    return SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
}
// 11. Refund Guard (check if refund is allowed)
function canRefund(orderStatus, paymentVerified, createdAt, maxRefundDays = 7) {
    if (orderStatus !== "PAID")
        return false;
    if (!paymentVerified)
        return false;
    const daysSinceOrder = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceOrder <= maxRefundDays;
}
function createPaymentLog(entry) {
    return JSON.stringify({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        hash: crypto_1.default.createHash("sha256").update(JSON.stringify(entry)).digest("hex").slice(0, 16),
    });
}
