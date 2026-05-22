"use strict";
// ============================================
// Payment Verification
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymentByTxRef = verifyPaymentByTxRef;
exports.verifyPaymentById = verifyPaymentById;
exports.validatePaymentAmount = validatePaymentAmount;
exports.isPaymentSuccessful = isPaymentSuccessful;
const FLW_BASE_URL = "https://api.flutterwave.com/v3";
function getSecretKey() {
    const key = process.env.FLW_SECRET_KEY;
    if (!key)
        throw new Error("FLW_SECRET_KEY not configured");
    return key;
}
async function verifyPaymentByTxRef(txRef) {
    try {
        const response = await fetch(`${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${getSecretKey()}`,
            },
        });
        const result = await response.json();
        if (result.status !== "success" || !result.data) {
            return null;
        }
        const data = result.data;
        return {
            txRef: data.tx_ref,
            flwRef: data.flw_ref,
            amount: data.amount,
            currency: data.currency,
            status: data.status === "successful" ? "successful" : data.status === "failed" ? "failed" : "pending",
            chargedAmount: data.charged_amount,
            customerEmail: data.customer?.email || "",
            paymentType: data.payment_type,
            createdAt: data.created_at,
        };
    }
    catch {
        return null;
    }
}
async function verifyPaymentById(transactionId) {
    try {
        const response = await fetch(`${FLW_BASE_URL}/transactions/${transactionId}/verify`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${getSecretKey()}`,
            },
        });
        const result = await response.json();
        if (result.status !== "success" || !result.data) {
            return null;
        }
        const data = result.data;
        return {
            txRef: data.tx_ref,
            flwRef: data.flw_ref,
            amount: data.amount,
            currency: data.currency,
            status: data.status === "successful" ? "successful" : data.status === "failed" ? "failed" : "pending",
            chargedAmount: data.charged_amount,
            customerEmail: data.customer?.email || "",
            paymentType: data.payment_type,
            createdAt: data.created_at,
        };
    }
    catch {
        return null;
    }
}
function validatePaymentAmount(expected, actual, tolerance = 0.01) {
    const diff = Math.abs(expected - actual);
    return diff <= tolerance * expected;
}
function isPaymentSuccessful(verification) {
    return verification?.status === "successful";
}
