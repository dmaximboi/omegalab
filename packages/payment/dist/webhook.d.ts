import type { WebhookPayload } from "./types";
export declare function verifyWebhookSignature(payload: string, signature: string): boolean;
export declare function parseWebhookPayload(body: string): WebhookPayload | null;
export declare function isChargeCompleted(payload: WebhookPayload): boolean;
export declare function extractTransactionDetails(payload: WebhookPayload): {
    txRef: string;
    flwRef: string;
    amount: number;
    currency: string;
    email: string;
};
export declare function validateWebhookTimestamp(timestamp: string, maxAgeSeconds?: number): boolean;
