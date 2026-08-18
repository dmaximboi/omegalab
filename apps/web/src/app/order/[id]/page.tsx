"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { 
  ArrowLeft, Package, Clock, CheckCircle, 
  Loader2, AlertCircle
} from "lucide-react";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: { id: string; name: string; images?: { url: string }[] };
}

interface Order {
  id: string;
  txRef: string;
  status: string;
  totalAmount: number;
  orderCurrency?: string;
  paymentCurrency?: string | null;
  paymentAmount?: number | null;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  resumeUrl?: string | null;
  items: OrderItem[];
}

const statusSteps = [
  { key: "INITIATED", label: "Order Placed", icon: Package },
  { key: "PROCESSING", label: "Processing", icon: Clock },
  { key: "VERIFYING", label: "Verifying", icon: CheckCircle },
  { key: "PAID", label: "Paid", icon: CheckCircle },
];

export default function OrderPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        } else if (res.status === 404) {
          setError("Order not found");
        } else {
          setError("Failed to load order");
        }
      } catch {
        setError("Could not connect to server");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const getStatusIndex = (status: string) => {
    return statusSteps.findIndex(s => s.key === status);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link 
            href="/account/orders"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
          >
            <ArrowLeft size={18} />
            Back to Orders
          </Link>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-8 text-center">
              <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{error}</h2>
              <p className="text-gray-500 dark:text-gray-400">Please check the order ID and try again</p>
            </div>
          ) : order ? (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Order #{order.txRef || order.id.slice(-8).toUpperCase()}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Placed on {formatDate(order.createdAt)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === "PAID"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : order.status === "FAILED" || order.status === "CANCELLED"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="relative mt-8">
                  <div className="flex justify-between">
                    {statusSteps.map((step, index) => {
                      const currentIndex = getStatusIndex(order.status);
                      const isCompleted = index <= currentIndex;
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex flex-col items-center flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isCompleted ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                          }`}>
                            <Icon size={20} />
                          </div>
                          <span className={`text-xs mt-2 text-center ${
                            isCompleted ? "text-blue-600 font-medium" : "text-gray-400"
                          }`}>
                            {step.label}
                          </span>
                          {index < statusSteps.length - 1 && (
                            <div className={`absolute top-5 h-0.5 ${
                              index < currentIndex ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                            }`} style={{
                              left: `${(index + 0.5) * (100 / statusSteps.length)}%`,
                              width: `${100 / statusSteps.length}%`,
                            }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Order Items</h2>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b dark:border-gray-700 last:border-0">
                      <div className="flex items-center gap-3">
                        {item.product.images?.[0]?.url && (
                          <img src={item.product.images[0].url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.product.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-semibold dark:text-white">₦{(item.unitPrice * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t dark:border-gray-700 mt-4 pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold dark:text-white">Total</span>
                  <span className="text-xl font-bold text-blue-600">
                    ₦{order.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {order.resumeUrl && order.status !== "PAID" && order.status !== "FAILED" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 text-center">
                  <Link
                    href={order.resumeUrl}
                    className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Resume Payment
                  </Link>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
