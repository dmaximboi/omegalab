"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Receipt } from "@/components/Receipt";
import { CheckCircle, ShoppingBag, Home, Loader2 } from "lucide-react";

interface OrderReceipt {
  orderNumber: string;
  receiptHash: string;
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  date: string;
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [loading, setLoading] = useState(!!orderId);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchReceipt = async () => {
      try {
        const res = await fetch(`/api/orders/receipt?id=${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const data = await res.json();
          setReceipt(data);
        }
      } catch {
        // Non-critical — receipt display is optional
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [orderId]);

  return (
    <div className="max-w-md mx-auto text-center px-4 w-full">
          {showReceipt && receipt ? (
            <div>
              <Receipt
                orderNumber={receipt.orderNumber}
                receiptHash={receipt.receiptHash}
                customerName={receipt.customerName}
                items={receipt.items}
                total={receipt.total}
                date={receipt.date}
              />
              <button
                onClick={() => setShowReceipt(false)}
                className="mt-4 text-sm text-navy/50 hover:text-navy transition"
              >
                ← Back to confirmation
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 shadow-sm">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">Order Confirmed!</h1>
              <p className="text-navy/60 dark:text-gray-400 mb-6">
                Thank you for your order. We&apos;ve received your payment and will begin processing your order shortly.
              </p>

              {orderId && (
                <div className="bg-light-grey dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <p className="text-sm text-navy/60 dark:text-gray-400 mb-1">Order Reference</p>
                  <p className="font-mono font-semibold text-navy dark:text-white">
                    #{orderId.slice(-8).toUpperCase()}
                  </p>
                </div>
              )}

              <p className="text-sm text-navy/60 dark:text-gray-400 mb-6">
                A confirmation email will be sent to you with your order details and tracking information.
              </p>

              {/* Receipt Button */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-3 text-navy/40">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading receipt...</span>
                </div>
              ) : receipt ? (
                <button
                  onClick={() => setShowReceipt(true)}
                  className="w-full flex items-center justify-center gap-2 bg-navy text-white px-6 py-3 rounded-lg hover:bg-navy/90 transition mb-3"
                >
                  View & Print Receipt (with QR)
                </button>
              ) : null}

              <div className="flex flex-col gap-3">
                <Link
                  href="/catalogue"
                  className="flex items-center justify-center gap-2 bg-sky text-white px-6 py-3 rounded-lg hover:bg-sky/90 transition"
                >
                  <ShoppingBag size={18} />
                  Continue Shopping
                </Link>
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 text-navy/60 dark:text-gray-400 hover:text-navy dark:hover:text-white px-6 py-3 rounded-lg transition"
                >
                  <Home size={18} />
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>
  );
}

export default function OrderSuccessPage() {
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
          <OrderSuccessContent />
        </Suspense>
      </main>
    </>
  );
}
