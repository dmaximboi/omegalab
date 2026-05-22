"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { 
  CheckCircle, XCircle, Loader2, ArrowLeft,
  Package, Calendar, User, Receipt
} from "lucide-react";

function VerifyQRContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "error">("loading");
  const [orderData, setOrderData] = useState<{
    orderNumber: string;
    customerName: string;
    date: string;
    items: { name: string; quantity: number }[];
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!code) {
      setStatus("invalid");
      return;
    }

    const verifyCode = async () => {
      try {
        const res = await fetch(`/api/verify-qr?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const data = await res.json();
          setOrderData(data.order);
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("error");
      }
    };

    verifyCode();
  }, [code]);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-8">
      {status === "loading" && (
        <div className="text-center py-8">
          <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
          <p className="text-gray-600">Verifying receipt...</p>
        </div>
      )}

      {status === "valid" && orderData && (
        <div>
          <div className="text-center mb-6">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
            <h1 className="text-2xl font-bold text-gray-900">Receipt Verified</h1>
            <p className="text-green-600">This is an authentic De-Omega receipt</p>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Receipt className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Order Number</p>
                <p className="font-semibold">{orderData.orderNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-semibold">{orderData.customerName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-semibold">{orderData.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Package className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Items</p>
                <ul className="font-semibold">
                  {orderData.items.map((item, i) => (
                    <li key={i}>{item.quantity}x {item.name}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total</span>
                <span className="text-xl font-bold text-blue-600">
                  ₦{orderData.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === "invalid" && (
        <div className="text-center py-8">
          <XCircle className="mx-auto text-red-500 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-900">Invalid Receipt</h1>
          <p className="text-red-600 mt-2">
            This QR code is not valid or has expired
          </p>
          <p className="text-gray-500 mt-4 text-sm">
            If you believe this is an error, please contact support
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center py-8">
          <XCircle className="mx-auto text-yellow-500 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-900">Verification Failed</h1>
          <p className="text-gray-600 mt-2">
            Could not verify the receipt. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}

export default function VerifyQRPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto px-4 py-12">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>

          <Suspense fallback={
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center py-16">
              <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
              <p className="text-gray-600">Loading verification details...</p>
            </div>
          }>
            <VerifyQRContent />
          </Suspense>
        </div>
      </main>
    </>
  );
}
