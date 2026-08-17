"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type OrderView = {
  totalAmount?: number;
  orderCurrency?: string;
  paymentAmount?: number | null;
  paymentCurrency?: string | null;
  status?: string;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default function PaymentProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "success" | "failed">("pending");
  const startingRef = useRef(false);

  useEffect(() => {
    if (orderId) {
      localStorage.setItem("pending_payment_order", orderId);
    }
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);

        if (data.status === "PAID") {
          setPaymentStatus("success");
          setTimeout(() => router.push(`/order/success?id=${orderId}`), 1500);
          return;
        }

        if (data.status === "FAILED") {
          setPaymentStatus("failed");
          setError("Payment failed. Please try again.");
          return;
        }

        await startCheckout();
      } else {
        setError("Order not found");
      }
    } catch {
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  const startCheckout = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setPaymentStatus("processing");
    setError("");

    try {
      const res = await fetch(`/api/orders/${orderId}/checkout`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.alreadyPaid) {
        setPaymentStatus("success");
        router.push(`/order/success?id=${orderId}`);
        return;
      }

      if (!res.ok || !data.checkoutUrl) {
        setPaymentStatus("failed");
        setError(data.error || "Could not start payment.");
        startingRef.current = false;
        return;
      }

      if (data.paymentAmount != null) {
        setOrder((prev) => ({
          ...(prev || {}),
          paymentAmount: data.paymentAmount,
          paymentCurrency: data.paymentCurrency || "USD",
          totalAmount: data.orderAmount ?? prev?.totalAmount,
          orderCurrency: data.orderCurrency || "NGN",
        }));
      }

      window.location.assign(data.checkoutUrl);
    } catch {
      setPaymentStatus("failed");
      setError("Could not start payment. Please try again.");
      startingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-400">Loading payment...</p>
        </div>
      </div>
    );
  }

  if (error && paymentStatus === "failed") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-8 max-w-md text-center">
          <AlertCircle className="text-red-600 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Failed</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => {
              startingRef.current = false;
              startCheckout();
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Retry Payment
          </button>
          <button
            onClick={() => router.push("/order")}
            className="block w-full mt-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Return to Cart
          </button>
        </div>
      </div>
    );
  }

  if (paymentStatus === "success") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-8 max-w-md text-center">
          <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h2>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to order confirmation...</p>
          <Loader2 className="animate-spin text-blue-600 mx-auto mt-4" size={24} />
        </div>
      </div>
    );
  }

  const orderCurrency = order?.orderCurrency || "NGN";
  const orderTotal = order?.totalAmount || 0;
  const paymentCurrency = order?.paymentCurrency || "USD";
  const paymentAmount = order?.paymentAmount;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-8 max-w-md text-center">
        <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Redirecting to secure checkout</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Order #<span className="font-mono">{orderId.slice(-8).toUpperCase()}</span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Order total: {formatMoney(orderTotal, orderCurrency)}
        </p>
        {paymentAmount != null && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Charged via Bachs: {formatMoney(paymentAmount, paymentCurrency)}
          </p>
        )}
        <p className="text-sm text-blue-600 mt-4">You will be sent to Bachs to complete payment.</p>
      </div>
    </div>
  );
}
