export declare function generateTransactionHash(txRef: string, amount: number, currency: string, secret: string): string;
export declare function verifyTransactionHash(txRef: string, amount: number, currency: string, secret: string, hash: string): boolean;
export declare function isValidAmount(amount: number, minAmount?: number, maxAmount?: number): boolean;
export declare function verifyFlutterwaveSignature(payload: string, signature: string, secret: string): boolean;
export declare function generateIdempotencyKey(userId: string, action: string, data: string): string;
export declare function isReplayAttack(timestamp: number, maxAgeSeconds?: number): boolean;
export interface FraudSignals {
    ipMismatch: boolean;
    unusualAmount: boolean;
    rapidTransactions: boolean;
    newAccount: boolean;
    differentDevice: boolean;
}
export declare function calculateFraudScore(signals: FraudSignals): number;
export declare function generatePaymentReceiptHash(orderId: string, userId: string, amount: string, salt: string): string;
export declare function verifyReceiptIntegrity(orderId: string, userId: string, amount: string, salt: string, hash: string): boolean;
export declare function isValidCurrency(currency: string): boolean;
export declare function canRefund(orderStatus: string, paymentVerified: boolean, createdAt: Date, maxRefundDays?: number): boolean;
export interface PaymentLogEntry {
    txRef: string;
    amount: number;
    currency: string;
    status: string;
    timestamp: Date;
    ipAddress: string;
    userId?: string;
}
export declare function createPaymentLog(entry: PaymentLogEntry): string;
