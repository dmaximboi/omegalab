"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
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
  Home
} from "lucide-react";

export const dynamic = "force-dynamic";

// Admin tabs configuration
const ADMIN_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { id: "products", label: "Products", icon: Package, href: "/admin/products" },
  { id: "orders", label: "Orders", icon: ShoppingCart, href: "/admin/orders" },
  { id: "messages", label: "Messages", icon: MessageSquare, href: "/admin/messages" },
  { id: "verify", label: "Verify QR", icon: QrCode, href: "/admin/verify-qr" },
];

/**
 * ADMIN DASHBOARD
 * Protection is handled by:
 * 1. middleware.ts - blocks at edge level
 * 2. admin/layout.tsx - server-side session check
 * This component only renders if user is verified admin
 */
export default function AdminDashboard() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Update active tab based on pathname
  useEffect(() => {
    const tab = ADMIN_TABS.find(t => pathname === t.href || (t.href !== "/admin" && pathname.startsWith(t.href)));
    if (tab) setActiveTab(tab.id);
  }, [pathname]);

  // Session is guaranteed by layout.tsx, but add safety check
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-light-grey flex items-center justify-center">
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
    <div className="min-h-screen bg-light-grey flex">
      {/* Sidebar - Facebook Style */}
      <aside className="w-64 bg-white border-r border-border fixed left-0 top-0 bottom-0 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg"
              alt="De-Omega Logo"
              width={36}
              height={36}
              className="rounded-xl"
            />
            <div>
              <span className="font-heading font-bold text-navy text-sm block">Admin Panel</span>
              <span className="text-[10px] text-navy/50">De-Omega Labaffairs</span>
            </div>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border">
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
              <p className="font-medium text-navy text-sm truncate">{session.user.name}</p>
              <p className="text-xs text-navy/50 truncate">{session.user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {ADMIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive 
                    ? "bg-sky/10 text-sky" 
                    : "text-navy/70 hover:bg-light-grey hover:text-navy"
                  }
                `}
              >
                <tab.icon size={20} />
                <span className="font-medium text-sm">{tab.label}</span>
                {isActive && (
                  <ChevronRight size={16} className="ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Back to Site */}
        <div className="p-3 border-t border-border">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-navy/60 hover:bg-light-grey hover:text-navy transition-all"
          >
            <Home size={20} />
            <span className="font-medium text-sm">Back to Site</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Top Header */}
        <header className="bg-white border-b border-border sticky top-0 z-40">
          <div className="px-6 py-4">
            <h1 className="text-xl font-heading font-bold text-navy">Dashboard</h1>
            <p className="text-sm text-navy/50">Welcome back, {session.user.name?.split(" ")[0]}</p>
          </div>
        </header>

        <div className="p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard 
              label="Total Orders" 
              value="--" 
              icon={ShoppingCart} 
              color="bg-sky" 
              subtitle="Fetched from database"
            />
            <StatCard 
              label="Pending Orders" 
              value="--" 
              icon={Loader2} 
              color="bg-amber-500"
              subtitle="Awaiting processing"
            />
            <StatCard 
              label="Total Revenue" 
              value={formatCurrency(0)} 
              icon={TrendingUp} 
              color="bg-green-500"
              subtitle="All time"
            />
            <StatCard 
              label="Products" 
              value="--" 
              icon={Package} 
              color="bg-purple-500"
              subtitle="Active products"
            />
            <StatCard 
              label="Users" 
              value="--" 
              icon={Users} 
              color="bg-indigo-500"
              subtitle="Registered users"
            />
            <StatCard 
              label="Unread Messages" 
              value="--" 
              icon={MessageSquare} 
              color="bg-red-500"
              subtitle="Contact form"
            />
          </div>

          {/* Quick Actions */}
          <h2 className="text-lg font-semibold text-navy mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ADMIN_TABS.filter(t => t.id !== "dashboard").map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className="bg-white rounded-xl border border-border p-5 hover:border-sky/30 hover:shadow-soft transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center group-hover:bg-sky/10 transition-colors">
                      <tab.icon className="text-navy" size={24} />
                    </div>
                    <div>
                      <span className="font-semibold text-navy block">{tab.label}</span>
                      <span className="text-sm text-navy/50">Manage {tab.label.toLowerCase()}</span>
                    </div>
                  </div>
                  <ChevronRight className="text-navy/30 group-hover:text-sky transition-colors" size={20} />
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
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-navy/60 mb-1">{label}</p>
          <p className="text-2xl font-bold text-navy">{value}</p>
          <p className="text-xs text-navy/40 mt-1">{subtitle}</p>
        </div>
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="text-white" size={22} />
        </div>
      </div>
    </div>
  );
}
