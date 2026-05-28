"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

declare global {
  interface Window {
    FlutterwaveCheckout: (config: any) => void;
  }
}

export const dynamic = "force-dynamic";

export default function PaymentProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flwLoaded, setFlwLoaded] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "success" | "failed">("pending");
  const [paymentToken, setPaymentToken] = useState<string>("");

  useEffect(() => {
    // Store order ID in localStorage for persistence
    if (orderId) {
      localStorage.setItem("pending_payment_order", orderId);
      // Retrieve payment token saved during order creation
      const storedToken = localStorage.getItem(`payment_token_${orderId}`) || "";
      setPaymentToken(storedToken);
    }
    
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      // Include payment token for authorization (guest checkout flow)
      const paymentToken = localStorage.getItem(`payment_token_${orderId}`) || "";
      const headers: Record<string, string> = {};
      if (paymentToken) {
        headers["x-payment-token"] = paymentToken;
      }
      const res = await fetch(`/api/orders/${orderId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        
        // If already paid, redirect to success
        if (data.status === "PAID") {
          setPaymentStatus("success");
          setTimeout(() => {
            router.push(`/order/success?id=${orderId}`);
          }, 2000);
          return;
        }
        
        // If failed, show error
        if (data.status === "FAILED") {
          setPaymentStatus("failed");
          setError("Payment failed. Please try again.");
          return;
        }
        
        // Auto-initiate payment after short delay
        setTimeout(() => initiatePayment(data), 1000);
      } else {
        setError("Order not found");
      }
    } catch (err) {
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = (orderData: any) => {
    if (!window.FlutterwaveCheckout) {
      setError("Payment system loading...");
      return;
    }

    setPaymentStatus("processing");

    window.FlutterwaveCheckout({
      public_key: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY,
      tx_ref: orderData.txRef,
      amount: orderData.totalAmount,
      currency: "NGN",
      payment_options: "card,mobilemoney,ussd,banktransfer",
      customer: {
        email: orderData.userEmail || "customer@example.com",
        phone_number: orderData.userPhone || "",
        name: orderData.userName || "Customer",
      },
      customizations: {
        title: "De-Omega Labaffairs",
        description: `Order #${orderId.slice(-8).toUpperCase()}`,
        logo: "https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg",
      },
      callback: async (response: any) => {
        try {
          // Use paymentToken from localStorage (not from orderData, which doesn't include it)
          const storedToken = localStorage.getItem(`payment_token_${orderId}`) || paymentToken;
          const verifyRes = await fetch("/api/orders/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transaction_id: response.transaction_id,
              orderId: orderId,
              paymentToken: storedToken,
            }),
          });

          if (verifyRes.ok) {
            setPaymentStatus("success");
            localStorage.removeItem("pending_payment_order");
            setTimeout(() => {
              router.push(`/order/success?id=${orderId}`);
            }, 1500);
          } else {
            setPaymentStatus("failed");
            setError("Payment verification failed. Please contact support.");
          }
        } catch {
          setPaymentStatus("failed");
          setError("Could not verify payment. Please contact support.");
        }
      },
      onclose: () => {
        if (paymentStatus !== "success") {
          // User closed without completing - redirect back to cart
          router.push("/order");
        }
      },
    });
  };

  const retryPayment = () => {
    if (order) {
      initiatePayment(order);
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
            onClick={retryPayment}
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-8 max-w-md text-center">
        <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Processing Payment</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Order #<span className="font-mono">{orderId.slice(-8).toUpperCase()}</span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Total: ₦{order?.totalAmount?.toLocaleString() || "0"}
        </p>
        {paymentStatus === "processing" && (
          <p className="text-sm text-blue-600 mt-4">Payment window should open shortly...</p>
        )}
        {!flwLoaded && (
          <p className="text-sm text-yellow-600 mt-4">Loading payment system...</p>
        )}
      </div>
      <Script
        src="https://checkout.flutterwave.com/v3.js"
        onLoad={() => setFlwLoaded(true)}
      />
    </div>
  );
}
