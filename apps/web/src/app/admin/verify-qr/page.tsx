"use client";

import { useState } from "react";
import { QrCode, Search, CheckCircle, XCircle, Loader2, Shield, AlertTriangle } from "lucide-react";

interface VerifyResult {
  verified: boolean;
  order?: {
    orderNumber: string;
    customerName: string;
    date: string;
    items: { name: string; quantity: number }[];
    total: number;
    paidAt: string | null;
    status: string;
  };
  error?: string;
}

export default function AdminVerifyQRPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/verify-qr?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();

      if (res.ok) {
        setResult({ verified: true, order: data.order });
      } else {
        setResult({ verified: false, error: data.error || "Verification failed" });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-sky/10 rounded-xl flex items-center justify-center">
            <QrCode className="text-sky" size={24} />
          </div>
          <div>
            <h2 className="font-bold text-navy text-lg">Receipt Verification</h2>
            <p className="text-sm text-navy/50">
              Enter or scan a receipt QR code to verify authenticity
            </p>
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleVerify} className="flex gap-3 mb-6">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter receipt hash code..."
            className="flex-1 px-4 py-3 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky/50"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-6 py-3 bg-sky text-white rounded-lg text-sm font-medium hover:bg-sky/90 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Verify
          </button>
        </form>

        {/* Security Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-xs text-navy/60">
          <div className="flex items-start gap-2">
            <Shield size={14} className="mt-0.5 text-sky" />
            <div>
              <p className="font-medium text-navy/80 mb-1">How QR Verification Works</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Each receipt contains a lookUp generated at order time</li>
                <li>The QR code encodes a URL with the lookUp as a verification parameter</li>
                <li>Verification checks this against the db</li>
                <li>Only paid & verified orders will return a valid result</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`rounded-xl border p-6 ${result.verified ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            {result.verified && result.order ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="text-green-600" size={32} />
                  <div>
                    <h3 className="font-bold text-green-800">Valid Receipt</h3>
                    <p className="text-sm text-green-600">This is an authentic De-Omega receipt</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700/60 text-xs">Order Number</span>
                    <p className="font-mono font-semibold text-green-900">{result.order.orderNumber}</p>
                  </div>
                  <div>
                    <span className="text-green-700/60 text-xs">Customer</span>
                    <p className="font-semibold text-green-900">{result.order.customerName}</p>
                  </div>
                  <div>
                    <span className="text-green-700/60 text-xs">Date</span>
                    <p className="font-semibold text-green-900">{result.order.date}</p>
                  </div>
                  <div>
                    <span className="text-green-700/60 text-xs">Total</span>
                    <p className="font-bold text-green-900">₦{result.order.total.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-green-700/60 text-xs">Status</span>
                    <p className="font-semibold text-green-900">{result.order.status}</p>
                  </div>
                  <div>
                    <span className="text-green-700/60 text-xs">Paid At</span>
                    <p className="font-semibold text-green-900">{result.order.paidAt ? new Date(result.order.paidAt).toLocaleString() : "—"}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-green-200">
                  <span className="text-green-700/60 text-xs">Items</span>
                  <ul className="mt-1 space-y-1">
                    {result.order.items.map((item, idx) => (
                      <li key={idx} className="text-sm text-green-900">
                        {item.quantity}× {item.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <XCircle className="text-red-600" size={32} />
                <div>
                  <h3 className="font-bold text-red-800">Invalid Receipt</h3>
                  <p className="text-sm text-red-600">
                    {result.error || "This code does not match"}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
                    <AlertTriangle size={12} />
                    This attempt has been logged for security
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
