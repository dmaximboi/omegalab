import type { PaymentVerification } from "./types";
export declare function verifyPaymentByTxRef(txRef: string): Promise<PaymentVerification | null>;
export declare function verifyPaymentById(transactionId: number): Promise<PaymentVerification | null>;
export declare function validatePaymentAmount(expected: number, actual: number, tolerance?: number): boolean;
export declare function isPaymentSuccessful(verification: PaymentVerification | null): boolean;
