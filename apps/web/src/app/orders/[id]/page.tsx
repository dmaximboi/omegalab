"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowLeft, Package, Loader2, CheckCircle, 
  Clock, XCircle, Copy, Download, RefreshCw, QrCode 
} from "lucide-react";

export const dynamic = "force-dynamic";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    images: { url: string }[];
  };
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  txRef: string;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    fetchOrder();
    
    // Set up SSE connection for real-time updates
    let eventSource: EventSource | null = null;
    
    if (params.id) {
      eventSource = new EventSource(`/api/orders/${params.id}/events`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "status" && order) {
            setOrder((prev) => prev ? { ...prev, status: data.status, paymentVerified: data.paymentVerified } : prev);
          }
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        eventSource?.close();
      };
    }
    
    return () => {
      eventSource?.close();
    };
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setError("Order not found");
      }
    } catch (error) {
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  const copyTxRef = () => {
    if (order?.txRef) {
      navigator.clipboard.writeText(order.txRef);
      alert("Transaction reference copied!");
    }
  };

  const checkStatus = async () => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/status`);
      if (res.ok) {
        const data = await res.json();
        setOrder({ ...order, status: data.status });
        alert(`Current status: ${data.status}`);
      }
    } catch (error) {
      alert("Failed to check status");
    }
  };

  const fetchReceipt = async () => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/receipt`);
      if (res.ok) {
        const data = await res.json();
        setReceipt(data);
        setShowReceipt(true);
      } else {
        alert("Failed to load receipt");
      }
    } catch (error) {
      alert("Failed to load receipt");
    }
  };

  const downloadReceipt = () => {
    if (!receipt) return;
    const receiptWindow = window.open("", "_blank");
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head><title>Receipt - Order #${order?.id.slice(-8).toUpperCase()}</title></head>
          <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1e293b;">De-Omega Labaffairs</h1>
            <h2 style="color: #64748b;">Order Receipt</h2>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p><strong>Order ID:</strong> #${receipt.order.id.slice(-8).toUpperCase()}</p>
            <p><strong>Date:</strong> ${new Date(receipt.order.createdAt).toLocaleString()}</p>
            <p><strong>Status:</strong> ${receipt.order.status}</p>
            <p><strong>Total:</strong> ₦${receipt.order.totalAmount.toLocaleString()}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
            <h3>Items</h3>
            ${receipt.order.items.map((item: any) => `
              <p>${item.product} × ${item.quantity} - ₦${(item.unitPrice * item.quantity).toLocaleString()}</p>
            `).join('')}
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-top: 30px;">
              <img src="${receipt.qrCode}" alt="QR Code" style="width: 200px; height: 200px;">
              <p style="margin-top: 10px; color: #64748b; font-size: 12px;">Scan to verify order</p>
            </div>
          </body>
        </html>
      `);
      receiptWindow.document.close();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle className="text-green-600" size={24} />;
      case "INITIATED":
      case "PROCESSING":
      case "VERIFYING":
        return <Clock className="text-yellow-600" size={24} />;
      case "FAILED":
        return <XCircle className="text-red-600" size={24} />;
      default:
        return <Clock className="text-gray-400" size={24} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PAID":
        return "Payment Successful";
      case "INITIATED":
        return "Order Initiated";
      case "PROCESSING":
        return "Payment Processing";
      case "VERIFYING":
        return "Verifying Payment";
      case "FAILED":
        return "Payment Failed";
      default:
        return status;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error || "Order not found"}</p>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <ArrowLeft size={18} />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Order Details</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Order #{order.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(order.status)}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getStatusText(order.status)}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">
                ₦{order.totalAmount.toLocaleString()}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={checkStatus}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
                <button
                  onClick={fetchReceipt}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <QrCode size={14} />
                  Receipt
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Transaction Reference:</span>
              <div className="flex items-center gap-2">
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{order.txRef}</code>
                <button
                  onClick={copyTxRef}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500 dark:text-gray-400">Check Status:</span>
              <button
                onClick={checkStatus}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-white">Order Items</h3>
          </div>
          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-4">
                <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product.images[0] ? (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="text-gray-300" size={32} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {item.product.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Quantity: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ₦{item.unitPrice.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    each
                  </p>
                </div>
                <p className="font-bold text-gray-900 dark:text-white w-24 text-right">
                  ₦{(item.unitPrice * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">Total</span>
              <span className="text-2xl font-bold text-blue-600">
                ₦{order.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Link
            href="/catalogue"
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Continue Shopping
          </Link>
          {order.status === "PAID" && (
            <button 
              onClick={fetchReceipt}
              className="flex items-center justify-center gap-2 px-6 py-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <Download size={20} />
              Download Receipt
            </button>
          )}
        </div>
      </main>

      {/* Receipt Modal */}
      {showReceipt && receipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Order Receipt</h3>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-navy">De-Omega Labaffairs</h2>
                  <p className="text-sm text-navy/60">Order Receipt</p>
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-medium">#{receipt.order.id.slice(-8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{new Date(receipt.order.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      receipt.order.status === 'PAID' ? 'text-green-600' : 'text-yellow-600'
                    }`}>{receipt.order.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-blue-600">₦{receipt.order.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Items</h4>
                  {receipt.order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.product} × {item.quantity}</span>
                      <span>₦{(item.unitPrice * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 text-center">
                  <img src={receipt.qrCode} alt="QR Code" className="mx-auto w-48 h-48" />
                  <p className="text-sm text-gray-500 mt-2">Scan to verify order</p>
                </div>

                <button
                  onClick={downloadReceipt}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Download Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
