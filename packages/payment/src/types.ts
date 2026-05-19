// ============================================
// Payment Types
// ============================================

export interface PaymentInitiation {
  txRef: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  redirectUrl: string;
  meta?: Record<string, string>;
}

export interface PaymentResponse {
  status: "success" | "error";
  message: string;
  data?: {
    link: string;
    txRef: string;
  };
}

export interface PaymentVerification {
  txRef: string;
  flwRef?: string;
  amount: number;
  currency: string;
  status: "successful" | "failed" | "pending";
  chargedAmount: number;
  customerEmail: string;
  paymentType: string;
  createdAt: string;
}

export interface WebhookPayload {
  event: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    charged_amount: number;
    status: string;
    payment_type: string;
    customer: {
      email: string;
      name: string;
      phone_number?: string;
    };
    created_at: string;
  };
}

export interface RefundRequest {
  flwRef: string;
  amount?: number;
  reason?: string;
}

export interface RefundResponse {
  status: "success" | "error";
  message: string;
  data?: {
    id: number;
    amount: number;
    status: string;
  };
}
