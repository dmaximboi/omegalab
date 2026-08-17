export interface PaymentInitiation {
  txRef: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentResponse {
  status: "success" | "error";
  message: string;
  data?: {
    checkoutUrl: string;
    checkoutId: string;
    txRef: string;
  };
}

export interface PaymentVerification {
  checkoutId: string;
  chargeId?: string;
  txRef: string;
  amount: string;
  currency: string;
  status: "successful" | "failed" | "pending";
  paymentStatus: string;
  customerEmail: string;
  metadata?: Record<string, string>;
}

export interface BachsCheckoutSession {
  checkout_id: string;
  checkout_url?: string;
  status: string;
  payment_status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  reference?: string | null;
  metadata?: Record<string, string> | null;
  charge?: {
    payment_id?: string;
    status?: string;
    amount?: string;
    currency?: string;
  } | null;
  customer?: {
    email?: string;
    name?: string;
  } | null;
}

export interface BachsWebhookEvent {
  id: string;
  type: string;
  created_at: string;
  organization_id?: string;
  data: {
    charge_id?: string | null;
    checkout_id?: string;
    reference?: string;
    status?: string;
    amount?: string;
    currency?: string;
    metadata?: Record<string, string>;
    customer?: {
      email?: string;
      name?: string;
    };
  };
}
