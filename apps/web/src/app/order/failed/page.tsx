"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { XCircle, Copy, Home, RefreshCw, Loader2, CheckCircle } from "lucide-react";

function OrderFailedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const transactionId = searchParams.get("tx");
  const [orderRef, setOrderRef] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderRef = async () => {
      try {
        const paymentToken = localStorage.getItem(`payment_token_${orderId}`) || "";
        const headers: Record<string, string> = {};
        if (paymentToken) headers["x-payment-token"] = paymentToken;
        
        const res = await fetch(`/api/orders/${orderId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setOrderRef(data.txRef || "");
        }
      } catch {
        // Non-critical
      }
    };

    fetchOrderRef();
  }, [orderId]);

  const txRef = orderRef || orderId?.slice(-8).toUpperCase() || "N/A";
  const txId = transactionId || "N/A";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto text-center px-4 w-full">
      {/* Failed Receipt - Cashier Machine Style */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Red Header */}
        <div className="bg-red-50 dark:bg-red-900/20 border-b dark:border-gray-700 p-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-red-700 dark:text-red-400">Payment Failed</h1>
          <p className="text-sm text-red-600/70 dark:text-red-400/70 mt-1">
            Your transaction could not be completed
          </p>
        </div>

        {/* Receipt Body */}
        <div className="p-6 font-mono text-sm">
          {/* Dashed separator */}
          <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-600 mb-4"></div>

          <div className="space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Status:</span>
              <span className="font-semibold text-red-600">FAILED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Order Ref:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{txRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Transaction ID:</span>
              <span className="font-semibold text-gray-900 dark:text-white text-xs">{txId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Date:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Dashed separator */}
          <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-600 my-4"></div>

          {/* Copy Reference Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Copy the details below and submit to admin for support:
            </p>
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg p-3 mb-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                Order: {txRef} | TX: {txId}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(`Order Reference: ${txRef}\nTransaction ID: ${txId}\nDate: ${new Date().toISOString()}`)}
              className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-gray-900 dark:bg-gray-600 text-white rounded-lg text-xs hover:bg-gray-800 dark:hover:bg-gray-500 transition"
            >
              {copied ? (
                <>
                  <CheckCircle size={14} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy Reference Details
                </>
              )}
            </button>
          </div>

          {/* Dashed separator */}
          <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-600 my-4"></div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
            If you were debited, please contact support with the reference above.
            Your money will be refunded within 24-48 hours.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 space-y-3">
          <Link
            href={orderId ? `/payment/${orderId}` : "/order"}
            className="flex items-center justify-center gap-2 w-full bg-sky text-white px-6 py-3 rounded-lg hover:bg-sky/90 transition"
          >
            <RefreshCw size={18} />
            Retry Payment
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-6 py-3 rounded-lg transition"
          >
            <Home size={18} />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderFailedPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-light-grey dark:bg-gray-900 flex items-center justify-center py-8">
        <Suspense fallback={
          <div className="max-w-md mx-auto text-center px-4 w-full">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 shadow-sm flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-sky animate-spin" />
            </div>
          </div>
        }>
          <OrderFailedContent />
        </Suspense>
      </main>
    </>
  );
}
