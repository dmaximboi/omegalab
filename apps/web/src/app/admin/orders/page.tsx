"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Loader2,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Monitor,
  CreditCard,
  Package,
  User,
  Filter,
  Search,
  Download,
  MessageSquare,
  Send,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_BADGES: Record<string, string> = {
  INITIATED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-amber-100 text-amber-700",
  VERIFYING: "bg-purple-100 text-purple-700",
  PAID: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PENDING: "bg-gray-100 text-gray-700",
};

interface TransactionStep {
  step: string;
  timestamp: string;
  ip: string | null;
  amount: number | null;
  details: Record<string, any> | null;
}

interface OrderItem {
  product: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  txRef: string;
  status: string;
  totalAmount: number;
  paymentVerified: boolean;
  providerRef: string | null;
  orderCurrency?: string;
  paymentCurrency?: string | null;
  paymentAmount?: number | null;
  fxRate?: number | null;
  fxSource?: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  customer: { name: string | null; email: string | null };
  items: OrderItem[];
  transactionSteps: TransactionStep[];
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Human-readable step explanations
const STEP_EXPLANATIONS: Record<string, { label: string; description: string; icon: any; color: string }> = {
  "step:INITIATED": {
    label: "Order Created",
    description: "Order was placed by the customer. Cart items validated, prices verified from database, total computed server-side with Decimal.js precision. HMAC receipt hash generated with cryptographic salt.",
    icon: Package,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  "step:PROCESSING": {
    label: "Payment Started",
    description: "Customer was redirected to Bachs hosted checkout. The payment gateway handles card/bank details. Waiting for the customer to complete payment.",
    icon: CreditCard,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  "step:VERIFYING": {
    label: "Verifying Payment",
    description: "Server is making a secure server-to-server API call to Bachs to verify the checkout session. Checking: (1) session status, (2) reference matches DB txRef, (3) paid USD amount >= locked paymentAmount, (4) currency is USD, (5) metadata.order_id matches.",
    icon: ShieldCheck,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  "step:PAID": {
    label: "Payment Confirmed",
    description: "All security checks passed. Payment verified successfully. Order status updated to PAID. Bachs charge ID stored. Receipt can be generated from HMAC hash.",
    icon: CheckCircle2,
    color: "text-green-600 bg-green-50 border-green-200",
  },
  "step:FAILED:not_success": {
    label: "Payment Failed — Gateway Rejected",
    description: "Bachs reported the checkout as NOT successful. This could be due to: insufficient funds, declined card, expired card, bank rejection, or customer cancellation.",
    icon: XCircle,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  "step:FAILED:txref_mismatch": {
    label: "Payment Failed — TX Ref Mismatch",
    description: "SECURITY ALERT: The reference returned by Bachs does NOT match the one stored in our database. This could indicate a replay attack or payment manipulation attempt. The IP has been logged.",
    icon: AlertTriangle,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  "step:FAILED:amount_mismatch": {
    label: "Payment Failed — Amount Mismatch",
    description: "SECURITY ALERT: The amount paid is LESS than the order total. Someone may have intercepted the checkout and reduced the amount. Decimal.js comparison: paidAmount < dbAmount.",
    icon: AlertTriangle,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  "step:FAILED:currency_mismatch": {
    label: "Payment Failed — Currency Mismatch",
    description: "SECURITY ALERT: Payment was made in a different currency than PAYMENT_CURRENCY. This is a currency substitution attack — paying in a weaker currency to get goods cheaper.",
    icon: AlertTriangle,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  "step:FAILED:expired": {
    label: "Order Expired",
    description: "The order was not paid within 24 hours and has expired. Pending orders auto-expire to prevent indefinite holds on inventory.",
    icon: Clock,
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
  "webhook:successful": {
    label: "Webhook Confirmed",
    description: "Bachs webhook fired as a backup confirmation. HMAC-SHA256 signature verified with a 5-minute timestamp window. Server-to-server re-verification passed. This is the secondary confirmation layer.",
    icon: Zap,
    color: "text-green-600 bg-green-50 border-green-200",
  },
};

function getStepInfo(step: string) {
  // Try exact match first
  if (STEP_EXPLANATIONS[step]) return STEP_EXPLANATIONS[step];

  // Try prefix match for dynamic failure reasons
  for (const key of Object.keys(STEP_EXPLANATIONS)) {
    if (step.startsWith(key)) return STEP_EXPLANATIONS[key];
  }

  // Fallback for unknown steps
  if (step.includes("FAILED")) {
    return {
      label: "Transaction Failed",
      description: `Failure recorded: ${step}. Check raw details below for debugging information.`,
      icon: XCircle,
      color: "text-red-600 bg-red-50 border-red-200",
    };
  }
  if (step.includes("webhook")) {
    return {
      label: "Webhook Event",
      description: `Webhook event processed: ${step}`,
      icon: Zap,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    };
  }

  return {
    label: step,
    description: "Transaction step recorded.",
    icon: Clock,
    color: "text-gray-600 bg-gray-50 border-gray-200",
  };
}

export default function AdminOrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageOrderId, setMessageOrderId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const fetchRef = useRef(false);

  const fetchOrders = async (page = 1, status = "") => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) params.set("status", status);

      const res = await fetch(`/api/admin/orders?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setOrders(data.orders);
      setPagination(data.pagination);
      setError("");
    } catch {
      setError("Could not load orders. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!fetchRef.current) {
      fetchRef.current = true;
      fetchOrders();
    }
  }, []);

  const handleFilter = (status: string) => {
    setStatusFilter(status);
    setLoading(true);
    fetchOrders(1, status);
  };

  const handlePageChange = (page: number) => {
    setLoading(true);
    fetchOrders(page, statusFilter);
  };

  const exportOrders = () => {
    const filteredOrders = orders.filter(order => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        order.id.toLowerCase().includes(query) ||
        order.customer.email?.toLowerCase().includes(query) ||
        order.txRef?.toLowerCase().includes(query)
      );
    });

    const csv = [
      ["Order ID", "Status", "Amount", "Customer", "Email", "Date", "TX Ref", "Provider Ref"],
      ...filteredOrders.map(order => [
        order.id.slice(-8).toUpperCase(),
        order.status,
        order.totalAmount,
        order.customer.name || "Guest",
        order.customer.email,
        new Date(order.createdAt).toLocaleString(),
        order.txRef,
        order.providerRef || ""
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendMessage = async () => {
    if (!messageOrderId || !messageText.trim()) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/admin/orders/${messageOrderId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });
      if (res.ok) {
        alert("Message sent successfully!");
        setMessageText("");
        setMessageOrderId(null);
      } else {
        alert("Failed to send message");
      }
    } catch {
      alert("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-sky animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy">Transaction Monitor</h2>
          <p className="text-sm text-navy/60">
            Full lifecycle logging of every order — 5-step state machine
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrders(pagination?.page || 1, statusFilter)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => exportOrders()}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" size={16} />
          <input
            type="text"
            placeholder="Search by order ID, email, or txRef..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky/20 focus:border-sky/30"
          />
        </div>
        {["", "INITIATED", "PROCESSING", "VERIFYING", "PAID", "FAILED"].map((s) => (
          <button
            key={s}
            onClick={() => handleFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition ${
              statusFilter === s
                ? "bg-navy text-white border-navy"
                : "bg-white text-navy/70 border-border hover:border-navy/30"
            }`}
          >
            <Filter size={12} className="inline mr-1" />
            {s || "All"}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Package className="w-12 h-12 text-navy/20 mx-auto mb-3" />
          <p className="text-navy/60">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders
            .filter(order => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              return (
                order.id.toLowerCase().includes(query) ||
                order.customer.email?.toLowerCase().includes(query) ||
                order.txRef?.toLowerCase().includes(query)
              );
            })
            .map((order) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <div key={order.id} className="bg-white rounded-xl border overflow-hidden">
                {/* Order Header */}
                <button
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_BADGES[order.status] || "bg-gray-100 text-gray-700"}`}>
                      {order.status}
                    </span>
                    <div>
                      <p className="font-semibold text-navy text-sm">
                        #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-navy/50">
                        {order.customer.name || "Guest"} • {order.customer.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-navy">{formatCurrency(order.totalAmount)}</p>
                      <p className="text-xs text-navy/50">{formatDate(order.createdAt)}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t px-6 py-5 space-y-6">
                    {/* Order Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InfoCard label="TX Reference" value={order.txRef} icon={CreditCard} />
                      <InfoCard label="Provider Reference" value={order.providerRef || "—"} icon={Zap} />
                      <InfoCard label="Verified" value={order.paymentVerified ? "Yes ✓" : "No"} icon={ShieldCheck} />
                      <InfoCard
                        label="Order Total (NGN)"
                        value={formatCurrency(order.totalAmount)}
                        icon={Package}
                      />
                      <InfoCard
                        label="Bachs Charge (USD)"
                        value={
                          order.paymentAmount != null
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: order.paymentCurrency || "USD",
                              }).format(order.paymentAmount)
                            : "—"
                        }
                        icon={CreditCard}
                      />
                      <InfoCard
                        label="FX Rate"
                        value={
                          order.fxRate != null
                            ? `₦${order.fxRate.toLocaleString()}/USD (${order.fxSource || "n/a"})`
                            : "—"
                        }
                        icon={Globe}
                      />
                      <InfoCard label="IP Address" value={order.ipAddress || "—"} icon={Globe} />
                      <InfoCard label="User Agent" value={order.userAgent?.slice(0, 60) + "..." || "—"} icon={Monitor} />
                      <InfoCard label="Customer" value={`${order.customer.name || "—"} (${order.customer.email})`} icon={User} />
                    </div>

                    {/* Order Items */}
                    <div>
                      <h4 className="text-sm font-semibold text-navy mb-2">Order Items</h4>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-navy/80">
                              {item.product} × {item.quantity}
                            </span>
                            <span className="font-medium text-navy">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                          <span>Total</span>
                          <span className="text-sky">{formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Send Message to Customer */}
                    <div>
                      <h4 className="text-sm font-semibold text-navy mb-2">Customer Communication</h4>
                      <button
                        onClick={() => setMessageOrderId(order.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-sky/10 text-sky rounded-lg hover:bg-sky/20 transition text-sm"
                      >
                        <MessageSquare size={16} />
                        Send Message to Customer
                      </button>
                    </div>

                    {/* Transaction Timeline — 5 Steps */}
                    <div>
                      <h4 className="text-sm font-semibold text-navy mb-3">
                        Transaction Lifecycle ({order.transactionSteps.length} events logged)
                      </h4>

                      {order.transactionSteps.length === 0 ? (
                        <p className="text-sm text-navy/50 italic">No transaction logs recorded yet.</p>
                      ) : (
                        <div className="relative">
                          {/* Timeline line */}
                          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

                          <div className="space-y-4">
                            {order.transactionSteps.map((step, idx) => {
                              const info = getStepInfo(step.step);
                              const Icon = info.icon;
                              const isLast = idx === order.transactionSteps.length - 1;

                              return (
                                <div key={idx} className="relative pl-12">
                                  {/* Timeline dot */}
                                  <div className={`absolute left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${info.color}`}>
                                    <Icon size={10} />
                                  </div>

                                  <div className={`rounded-lg border p-4 ${isLast ? info.color : "bg-white border-gray-200"}`}>
                                    <div className="flex items-start justify-between mb-1">
                                      <h5 className="font-semibold text-sm text-navy">
                                        {info.label}
                                      </h5>
                                      <span className="text-xs text-navy/50 whitespace-nowrap ml-4">
                                        {formatDate(step.timestamp)}
                                      </span>
                                    </div>

                                    <p className="text-xs text-navy/70 leading-relaxed mb-2">
                                      {info.description}
                                    </p>

                                    {/* Raw metadata */}
                                    {(step.ip || step.amount || step.details) && (
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy/60">
                                          {step.ip && (
                                            <span>
                                              <Globe size={10} className="inline mr-1" />
                                              IP: {step.ip}
                                            </span>
                                          )}
                                          {step.amount && (
                                            <span>
                                              <CreditCard size={10} className="inline mr-1" />
                                              Amount: {formatCurrency(step.amount)}
                                            </span>
                                          )}
                                        </div>

                                        {step.details && (
                                          <details className="mt-2">
                                            <summary className="text-xs font-medium text-navy/50 cursor-pointer hover:text-navy/70">
                                              Raw Log Data (click to expand)
                                            </summary>
                                            <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto font-mono">
                                              {JSON.stringify(step.details, null, 2)}
                                            </pre>
                                          </details>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t text-xs text-navy/50">
                      <div>
                        <span className="block font-medium text-navy/70">Created</span>
                        {formatDate(order.createdAt)}
                      </div>
                      <div>
                        <span className="block font-medium text-navy/70">Last Updated</span>
                        {formatDate(order.updatedAt)}
                      </div>
                      <div>
                        <span className="block font-medium text-navy/70">Verified At</span>
                        {order.verifiedAt ? formatDate(order.verifiedAt) : "—"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                p === pagination.page
                  ? "bg-navy text-white"
                  : "bg-white border hover:bg-gray-50 text-navy/70"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Message Modal */}
      {messageOrderId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Send Message to Customer</h3>
                <button
                  onClick={() => {
                    setMessageOrderId(null);
                    setMessageText("");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle size={20} />
                </button>
              </div>
              
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Enter your message to the customer..."
                className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-sky/20 focus:border-sky/30 resize-none"
              />
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setMessageOrderId(null);
                    setMessageText("");
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !messageText.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-sky text-white px-4 py-2 rounded-lg hover:bg-sky/90 transition disabled:opacity-50"
                >
                  {sendingMessage ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Send size={16} />
                  )}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className="text-navy/40" />
        <span className="text-xs font-medium text-navy/50">{label}</span>
      </div>
      <p className="text-sm text-navy font-mono truncate" title={value}>
        {value}
      </p>
    </div>
  );
}
