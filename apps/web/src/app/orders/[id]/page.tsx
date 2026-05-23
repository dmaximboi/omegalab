"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowLeft, Package, Loader2, CheckCircle, 
  Clock, XCircle, Copy, Download 
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

  useEffect(() => {
    fetchOrder();
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 mb-4">{error || "Order not found"}</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Order Details</h1>
              <p className="text-sm text-gray-500">Order #{order.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Status Card */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(order.status)}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {getStatusText(order.status)}
                </h2>
                <p className="text-sm text-gray-500">
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">
                ₦{order.totalAmount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Transaction Reference:</span>
              <div className="flex items-center gap-2">
                <code className="bg-gray-100 px-2 py-1 rounded">{order.txRef}</code>
                <button
                  onClick={copyTxRef}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Order Items</h3>
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
                  <p className="font-medium text-gray-900">
                    {item.product.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Quantity: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ₦{item.unitPrice.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    each
                  </p>
                </div>
                <p className="font-bold text-gray-900 w-24 text-right">
                  ₦{(item.unitPrice * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total</span>
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
            <button className="flex items-center justify-center gap-2 px-6 py-3 border rounded-lg hover:bg-gray-50 transition">
              <Download size={20} />
              Download Receipt
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
