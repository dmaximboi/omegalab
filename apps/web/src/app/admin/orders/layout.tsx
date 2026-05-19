"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageSquare,
  QrCode,
  Home,
  Users,
  ChevronRight,
} from "lucide-react";

const ADMIN_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { id: "products", label: "Products", icon: Package, href: "/admin/products" },
  { id: "orders", label: "Orders", icon: ShoppingCart, href: "/admin/orders" },
  { id: "messages", label: "Messages", icon: MessageSquare, href: "/admin/messages" },
  { id: "verify", label: "Verify QR", icon: QrCode, href: "/admin/verify-qr" },
];

export default function AdminOrdersLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-light-grey flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-border fixed left-0 top-0 bottom-0 flex flex-col">
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

        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {session?.user?.image ? (
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
              <p className="font-medium text-navy text-sm truncate">{session?.user?.name}</p>
              <p className="text-xs text-navy/50 truncate">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {ADMIN_TABS.map((tab) => {
            const isActive = pathname === tab.href || (tab.href !== "/admin" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-sky/10 text-sky"
                    : "text-navy/70 hover:bg-light-grey hover:text-navy"
                }`}
              >
                <tab.icon size={20} />
                <span className="font-medium text-sm">{tab.label}</span>
                {isActive && <ChevronRight size={16} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

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
        <header className="bg-white border-b border-border sticky top-0 z-40">
          <div className="px-6 py-4">
            <h1 className="text-xl font-heading font-bold text-navy">Orders & Transactions</h1>
            <p className="text-sm text-navy/50">Monitor payment lifecycle, security events, and transaction logs</p>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
