"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageSquare,
  QrCode,
  Users,
  TrendingUp,
  Loader2,
  ChevronRight,
  Home,
  Activity,
  BarChart3,
} from "lucide-react";

export const dynamic = "force-dynamic";

// Admin tabs configuration
const ADMIN_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { id: "products", label: "Products", icon: Package, href: "/admin/products" },
  { id: "orders", label: "Orders", icon: ShoppingCart, href: "/admin/orders" },
  { id: "messages", label: "Messages", icon: MessageSquare, href: "/admin/messages" },
  { id: "transactions", label: "Transactions", icon: Activity, href: "/admin/transactions" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  { id: "users", label: "Users", icon: Users, href: "/admin/users" },
  { id: "verify", label: "Verify QR", icon: QrCode, href: "/admin/verify-qr" },
];

/**
 * ADMIN DASHBOARD
 * Protection is handled by:
 * 1. middleware.ts - blocks at edge level
 * 2. admin/layout.tsx - server-side session check
 * This component only renders if user is verified admin
 */
interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  paidOrders: number;
  failedOrders: number;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [navigating, setNavigating] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [messageCount, setMessageCount] = useState<number | null>(null);

  const handleTabClick = (e: React.MouseEvent, tabId: string, href: string) => {
    if (navigating) {
      e.preventDefault();
      return;
    }
    setNavigating(tabId);
    router.push(href);
  };

  // Clear navigating state when pathname changes
  useEffect(() => {
    setNavigating(null);
  }, [pathname]);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [analyticsRes, productsRes, usersRes, messagesRes] = await Promise.allSettled([
          fetch("/api/admin/analytics"),
          fetch("/api/admin/products"),
          fetch("/api/admin/users"),
          fetch("/api/admin/messages"),
        ]);

        if (analyticsRes.status === "fulfilled" && analyticsRes.value.ok) {
          const data = await analyticsRes.value.json();
          setStats({
            totalOrders: data.totalOrders || 0,
            pendingOrders: data.pendingOrders || 0,
            totalRevenue: Number(data.totalRevenue) || 0,
            paidOrders: data.paidOrders || 0,
            failedOrders: data.failedOrders || 0,
          });
        }

        if (productsRes.status === "fulfilled" && productsRes.value.ok) {
          const data = await productsRes.value.json();
          setProductCount(Array.isArray(data) ? data.length : data.products?.length || 0);
        }

        if (usersRes.status === "fulfilled" && usersRes.value.ok) {
          const data = await usersRes.value.json();
          setUserCount(Array.isArray(data) ? data.length : data.users?.length || 0);
        }

        if (messagesRes.status === "fulfilled" && messagesRes.value.ok) {
          const data = await messagesRes.value.json();
          const msgs = Array.isArray(data) ? data : data.messages || [];
          setMessageCount(msgs.filter((m: any) => !m.isRead).length);
        }
      } catch (err) {
        console.error("[ADMIN] Failed to fetch stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Session is guaranteed by layout.tsx, but add safety check
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-light-grey dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky animate-spin" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-light-grey dark:bg-gray-900 flex">
      {/* Sidebar - Facebook Style */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-border dark:border-gray-700 fixed left-0 top-0 bottom-0 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-border dark:border-gray-700">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg"
              alt="De-Omega Logo"
              width={36}
              height={36}
              className="rounded-xl"
            />
            <div>
              <span className="font-heading font-bold text-navy dark:text-white text-sm block">Admin Panel</span>
              <span className="text-[10px] text-navy/50 dark:text-gray-400">De-Omega Labaffairs</span>
            </div>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border dark:border-gray-700">
          <div className="flex items-center gap-3">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "Admin"}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-sky/10 rounded-full flex items-center justify-center">
                <Users className="text-sky" size={18} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-navy dark:text-white text-sm truncate">{session.user.name}</p>
              <p className="text-xs text-navy/50 dark:text-gray-400 truncate">{session.user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {ADMIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isNavigating = navigating === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={(e) => handleTabClick(e, tab.id, tab.href)}
                disabled={isNavigating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive 
                    ? "bg-sky/10 text-sky" 
                    : "text-navy/70 dark:text-gray-300 hover:bg-light-grey dark:hover:bg-gray-700 hover:text-navy dark:hover:text-white"
                  }
                  ${isNavigating ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                <AnimatePresence mode="wait">
                  {isNavigating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 className="animate-spin" size={20} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <tab.icon size={20} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className="font-medium text-sm">{tab.label}</span>
                <AnimatePresence>
                  {isActive && !isNavigating && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                    >
                      <ChevronRight size={16} className="ml-auto" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </nav>

        {/* Back to Site */}
        <div className="p-3 border-t border-border dark:border-gray-700">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-navy/60 dark:text-gray-400 hover:bg-light-grey dark:hover:bg-gray-700 hover:text-navy dark:hover:text-white transition-all"
          >
            <Home size={20} />
            <span className="font-medium text-sm">Back to Site</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-border dark:border-gray-700 sticky top-0 z-40">
          <div className="px-6 py-4">
            <h1 className="text-xl font-heading font-bold text-navy dark:text-white">Dashboard</h1>
            <p className="text-sm text-navy/50 dark:text-gray-400">Welcome back, {session.user.name?.split(" ")[0]}</p>
          </div>
        </header>

        <div className="p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard 
              label="Total Orders" 
              value={statsLoading ? "..." : (stats?.totalOrders ?? 0)} 
              icon={ShoppingCart} 
              color="bg-sky" 
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

          {/* Quick Actions */}
          <h2 className="text-lg font-semibold text-navy dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ADMIN_TABS.filter(t => t.id !== "dashboard").map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-5 hover:border-sky/30 hover:shadow-soft transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-navy/5 dark:bg-gray-700 rounded-xl flex items-center justify-center group-hover:bg-sky/10 transition-colors">
                      <tab.icon className="text-navy dark:text-white" size={24} />
                    </div>
                    <div>
                      <span className="font-semibold text-navy dark:text-white block">{tab.label}</span>
                      <span className="text-sm text-navy/50 dark:text-gray-400">Manage {tab.label.toLowerCase()}</span>
                    </div>
                  </div>
                  <ChevronRight className="text-navy/30 dark:text-gray-500 group-hover:text-sky transition-colors" size={20} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color, 
  subtitle 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType; 
  color: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-navy/60 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-navy dark:text-white">{value}</p>
          <p className="text-xs text-navy/40 dark:text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="text-white" size={22} />
        </div>
      </div>
    </div>
  );
}
