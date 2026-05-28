"use client";

import { useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { 
  Menu, 
  X, 
  Home, 
  ShoppingBag, 
  Mail, 
  Settings,
  LogOut,
  User,
  ChevronDown,
  ShoppingCart,
  Moon,
  Sun
} from "lucide-react";
import { cart } from "@/lib/cart";
import { useTheme } from "@/lib/theme";
import NotificationBell from "@/components/NotificationBell";

const NAV_TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/catalogue", label: "Catalogue", icon: ShoppingBag },
  { href: "/contact", label: "Contact", icon: Mail },
];

const ADMIN_TAB = { href: "/admin", label: "Admin", icon: Settings };

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.isAdmin === true;
  const isLoading = status === "loading";

  const tabs = isAdmin ? [...NAV_TABS, ADMIN_TAB] : NAV_TABS;

  useEffect(() => {
    const updateCartCount = () => {
      setCartCount(cart.getItemCount());
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);

    // If user is logged in, sync cart from server
    if (session?.user) {
      cart.loadFromServer().then(() => {
        updateCartCount();
        window.dispatchEvent(new Event("storage"));
      });
    }

    return () => window.removeEventListener("storage", updateCartCount);
  }, [session?.user]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-border dark:border-gray-700">
      {/* Top Bar */}
      <div className="border-b border-border/50 dark:border-gray-700">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg"
                alt="De-Omega Logo"
                width={36}
                height={36}
                className="rounded-xl"
              />
              <div>
                <span className="font-heading font-bold text-navy dark:text-white text-sm">De-Omega</span>
                <span className="text-[10px] text-navy/50 block -mt-0.5 hidden sm:block">Labaffairs Nig. Ltd.</span>
              </div>
            </Link>

            {/* User Section */}
            <div className="flex items-center gap-3">
              {/* Cart Button */}
              <Link
                href="/order"
                className="relative p-2 rounded-full hover:bg-light-grey dark:hover:bg-gray-800 transition-colors"
              >
                <ShoppingCart size={20} className="text-navy dark:text-gray-200" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-sky text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              {session?.user && <NotificationBell />}

              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-light-grey dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="text-navy dark:text-yellow-400" size={20} />
                ) : (
                  <Moon className="text-navy" size={20} />
                )}
              </button>

              {isLoading ? (
                <div className="w-8 h-8 bg-light-grey dark:bg-gray-700 rounded-full animate-pulse" />
              ) : session?.user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-light-grey dark:hover:bg-gray-800 transition-colors"
                  >
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-sky/10 rounded-full flex items-center justify-center">
                        <User className="text-sky" size={16} />
                      </div>
                    )}
                    <ChevronDown size={14} className="text-navy/50 dark:text-gray-400 hidden sm:block" />
                  </button>

                  {/* User Dropdown */}
                  {showUserMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowUserMenu(false)} 
                      />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 shadow-lg z-50 overflow-hidden">
                        <div className="p-3 border-b border-border dark:border-gray-700">
                          <p className="font-medium text-navy dark:text-white text-sm truncate">
                            {session.user.name}
                          </p>
                          <p className="text-xs text-navy/50 dark:text-gray-400 truncate">
                            {session.user.email}
                          </p>
                          {isAdmin && (
                            <span className="inline-block mt-1.5 px-2 py-0.5 bg-sky/10 text-sky text-[10px] font-medium rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="p-1.5">
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              signOut();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <LogOut size={16} />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 text-navy dark:text-gray-200 hover:bg-light-grey dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - TikTok/Facebook Style */}
      <div className="hidden md:block">
        <div className="container">
          <nav className="flex items-center justify-center">
            {tabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors
                    ${active 
                      ? "text-sky" 
                      : "text-navy/60 dark:text-gray-400 hover:text-navy dark:hover:text-white hover:bg-light-grey/50 dark:hover:bg-gray-800"
                    }
                  `}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky rounded-t-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Menu with Backdrop */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          {/* Menu */}
          <div 
            ref={menuRef}
            className="fixed top-[57px] left-0 right-0 bg-white dark:bg-gray-900 border-b border-border dark:border-gray-700 z-50 md:hidden max-h-[calc(100vh-57px)] overflow-y-auto"
          >
            <nav className="container py-3">
              {tabs.map((tab) => {
                const active = isActive(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors
                      ${active 
                        ? "bg-sky/10 text-sky" 
                        : "text-navy/70 dark:text-gray-300 hover:bg-light-grey dark:hover:bg-gray-800 active:bg-light-grey"
                      }
                    `}
                  >
                    <tab.icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}

export default memo(Navbar);
