"use client";

import { useState, useEffect, useRef } from "react";
import { QrCode, Search, CheckCircle, XCircle, Loader2, Shield, AlertTriangle, Camera, CameraOff } from "lucide-react";

export const dynamic = "force-dynamic";

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
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const scannerRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Verify a code (hash or txRef)
  const verifyCode = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/verify-qr?code=${encodeURIComponent(codeToVerify.trim())}`);
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

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await verifyCode(code);
  };

  // Extract the code param from a verify-qr URL
  const extractCodeFromUrl = (text: string): string => {
    try {
      const url = new URL(text);
      const codeParam = url.searchParams.get("code");
      if (codeParam) return codeParam;
    } catch {
      // Not a URL — use as-is
    }
    return text;
  };

  // Start QR scanner
  const startScanner = async () => {
    setScannerError("");
    setScannerActive(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Small delay to let the container render
      await new Promise((r) => setTimeout(r, 100));

      if (!scannerContainerRef.current) return;

      const scanner = new Html5Qrcode("qr-scanner-region");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText: string) => {
          // QR code scanned — extract the code and verify
          const extractedCode = extractCodeFromUrl(decodedText);
          setCode(extractedCode);
          stopScanner();
          verifyCode(extractedCode);
        },
        () => {
          // QR scan error (no match found in frame) — ignore
        }
      );
    } catch (err: any) {
      console.error("[QR SCANNER] Error:", err);
      setScannerError(
        err?.message?.includes("NotAllowedError") || err?.message?.includes("Permission")
          ? "Camera access denied. Please allow camera permissions."
          : "Could not start camera. Make sure no other app is using it."
      );
      setScannerActive(false);
    }
  };

  // Stop QR scanner
  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch {
      // Already stopped
    }
    setScannerActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <QrCode className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">Receipt Verification</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Scan QR code or enter transaction reference to verify
            </p>
          </div>
        </div>

        {/* QR Camera Scanner */}
        <div className="mb-6">
          {!scannerActive ? (
            <button
              onClick={startScanner}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-900 dark:bg-blue-600 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-blue-700 transition text-sm font-medium"
            >
              <Camera size={20} />
              Open Camera Scanner
            </button>
          ) : (
            <div className="space-y-3">
              <div
                ref={scannerContainerRef}
                className="rounded-xl overflow-hidden border-2 border-blue-500"
              >
                <div id="qr-scanner-region" className="w-full" />
              </div>
              <button
                onClick={stopScanner}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
              >
                <CameraOff size={16} />
                Close Camera
              </button>
            </div>
          )}

          {scannerError && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {scannerError}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs text-gray-400 font-medium">OR ENTER MANUALLY</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Manual Input */}
        <form onSubmit={handleVerify} className="flex gap-3 mb-6">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter receipt hash or transaction ref (OMEGA-...)..."
            className="flex-1 px-4 py-3 border dark:border-gray-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:bg-gray-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Verify
          </button>
        </form>

        {/* Security Info */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <Shield size={14} className="mt-0.5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">How QR Verification Works</p>
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
