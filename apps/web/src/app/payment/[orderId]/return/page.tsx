"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PaymentReturnPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const verify = async () => {
      try {
        const res = await fetch("/api/orders/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        if (cancelled) return;

        if (res.ok) {
          localStorage.removeItem("pending_payment_order");
          router.replace(`/order/success?id=${encodeURIComponent(orderId)}`);
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (res.status === 202 || data.pending) {
          attempts += 1;
          if (attempts < 8) {
            setTimeout(verify, 1500);
            return;
          }
        }

        router.replace(`/order/failed?id=${encodeURIComponent(orderId)}`);
      } catch {
        if (!cancelled) setError("Could not confirm payment. If you were charged, contact support.");
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [orderId, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-8 max-w-md text-center">
          <AlertCircle className="text-red-600 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirmation delayed</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/order/failed?id=${encodeURIComponent(orderId)}`)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-8 max-w-md text-center">
        <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirming payment</h2>
        <p className="text-gray-600 dark:text-gray-400">Please wait while we verify your payment with Bachs.</p>
      </div>
    </div>
  );
}
