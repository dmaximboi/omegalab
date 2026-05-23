"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  Package,
} from "lucide-react";

export const dynamic = "force-dynamic";

const COLORS = ["#00AAFF", "#0A1F5C", "#F4F6FA", "#10B981", "#EF4444"];

interface AnalyticsData {
  totalRevenue: number;
  revenue30Days: number;
  revenue7Days: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
  dailyRevenue: any[];
  revenueByStatus: any[];
  topProducts: { name: string; quantity: number }[];
}

export default function AdminAnalyticsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        const analytics = await res.json();
        setData(analytics);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-sky animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="mx-auto text-navy/20 mb-3" size={48} />
        <p className="text-navy/60">Failed to load analytics</p>
      </div>
    );
  }

  const dailyRevenueData = data.dailyRevenue.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
    revenue: Number(item.revenue),
    orders: Number(item.orders),
  }));

  const statusData = data.revenueByStatus.map((item: any) => ({
    name: item.status,
    value: Number(item.revenue),
    count: Number(item.count),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-navy">Analytics Dashboard</h2>
        <p className="text-sm text-navy/60">Revenue and order insights</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky/10 rounded-lg">
              <DollarSign className="text-sky" size={20} />
            </div>
            <div>
              <p className="text-sm text-navy/60">Total Revenue</p>
              <p className="text-2xl font-bold text-navy">{formatCurrency(data.totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-navy/60">Revenue (30d)</p>
              <p className="text-2xl font-bold text-navy">{formatCurrency(data.revenue30Days)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ShoppingCart className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-navy/60">Total Orders</p>
              <p className="text-2xl font-bold text-navy">{data.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-navy/60">Pending Orders</p>
              <p className="text-2xl font-bold text-navy">{data.pendingOrders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Chart */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-navy mb-4">Daily Revenue (30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#00AAFF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Status */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-navy mb-4">Revenue by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-navy mb-4">Top Products (by quantity sold)</h3>
        <div className="space-y-3">
          {data.topProducts.map((product, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky/10 rounded-lg">
                  <Package className="text-sky" size={16} />
                </div>
                <span className="font-medium text-navy">{product.name}</span>
              </div>
              <span className="text-sm text-navy/60">{product.quantity} sold</span>
            </div>
          ))}
          {data.topProducts.length === 0 && (
            <p className="text-sm text-navy/50 italic">No product data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
