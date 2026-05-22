import type { PaymentInitiation, PaymentResponse } from "./types";
export declare function initiatePayment(data: PaymentInitiation): Promise<PaymentResponse>;
export declare function generatePaymentLink(txRef: string, amount: number, email: string, redirectUrl: string): string;
