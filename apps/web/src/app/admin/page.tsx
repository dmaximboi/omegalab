"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  MessageSquare,
  QrCode,
  Users,
  TrendingUp,
  Loader2,
  ChevronRight,
  Activity,
  BarChart3,
} from "lucide-react";

export const dynamic = "force-dynamic";

const ADMIN_TABS = [
  { id: "products", label: "Products", icon: Package, href: "/admin/products" },
  { id: "orders", label: "Orders", icon: ShoppingCart, href: "/admin/orders" },
  { id: "messages", label: "Messages", icon: MessageSquare, href: "/admin/messages" },
  { id: "transactions", label: "Transactions", icon: Activity, href: "/admin/transactions" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  { id: "users", label: "Users", icon: Users, href: "/admin/users" },
  { id: "verify", label: "Verify QR", icon: QrCode, href: "/admin/verify-qr" },
];

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  paidOrders: number;
  failedOrders: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [messageCount, setMessageCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/overview");
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalOrders: data.totalOrders || 0,
            pendingOrders: data.pendingOrders || 0,
            totalRevenue: Number(data.totalRevenue) || 0,
            paidOrders: data.paidOrders || 0,
            failedOrders: data.failedOrders || 0,
          });
          setProductCount(data.productCount ?? 0);
          setUserCount(data.userCount ?? 0);
          setMessageCount(data.messageCount ?? 0);
        }
      } catch (err) {
        console.error("[ADMIN] Failed to fetch stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of store activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Orders"
          value={statsLoading ? "..." : (stats?.totalOrders ?? 0)}
          icon={ShoppingCart}
          color="bg-blue-600"
          subtitle={`${stats?.paidOrders ?? 0} paid`}
        />
        <StatCard
          label="Pending Orders"
          value={statsLoading ? "..." : (stats?.pendingOrders ?? 0)}
          icon={Loader2}
          color="bg-amber-500"
          subtitle="Awaiting processing"
        />
        <StatCard
          label="Total Revenue"
          value={statsLoading ? "..." : formatCurrency(stats?.totalRevenue ?? 0)}
          icon={TrendingUp}
          color="bg-green-500"
          subtitle="All time"
        />
        <StatCard
          label="Products"
          value={statsLoading ? "..." : (productCount ?? 0)}
          icon={Package}
          color="bg-purple-500"
          subtitle="Active products"
        />
        <StatCard
          label="Users"
          value={statsLoading ? "..." : (userCount ?? 0)}
          icon={Users}
          color="bg-indigo-500"
          subtitle="Registered users"
        />
        <StatCard
          label="Unread Messages"
          value={statsLoading ? "..." : (messageCount ?? 0)}
          icon={MessageSquare}
          color="bg-red-500"
          subtitle="Contact form"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ADMIN_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                    <tab.icon className="text-gray-900 dark:text-white" size={24} />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white block">{tab.label}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Manage {tab.label.toLowerCase()}</span>
                  </div>
                </div>
                <ChevronRight className="text-gray-300 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" size={20} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="text-white" size={22} />
        </div>
      </div>
    </div>
  );
}
