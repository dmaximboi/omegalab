"use client";

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
  Activity,
  BarChart3,
  Home,
  Loader2,
} from "lucide-react";

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

function getActiveTab(pathname: string): string {
  if (pathname === "/admin") return "dashboard";
  const match = ADMIN_TABS.find((t) => t.href !== "/admin" && pathname.startsWith(t.href));
  return match?.id || "dashboard";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 fixed left-0 top-0 bottom-0 flex flex-col z-50">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg"
              alt="De-Omega Logo"
              width={36}
              height={36}
              className="rounded-xl"
            />
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-sm block">Admin Panel</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">De-Omega Labaffairs</span>
            </div>
          </Link>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
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
              <div className="w-10 h-10 bg-blue-50 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Users className="text-blue-600 dark:text-blue-400" size={18} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{session.user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.user.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {ADMIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                  ${isActive
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  }
                `}
              >
                <tab.icon size={20} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all text-sm font-medium"
          >
            <Home size={20} />
            <span>Back to Site</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
