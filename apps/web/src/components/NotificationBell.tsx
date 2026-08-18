"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Package, MessageSquare, Info, Trash2, CheckCircle, XCircle, Printer, ExternalLink } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

// Extract orderId from notification body tag [orderId:xxx]
function extractOrderId(body: string): string | null {
  const match = body.match(/\[orderId:([^\]]+)\]/);
  return match ? match[1] : null;
}

// Strip the [orderId:xxx] tag from display text
function cleanBody(body: string): string {
  return body.replace(/\s*\[orderId:[^\]]+\]/, "");
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isOpen, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      // Synthetic notifications are already "read" — skip API call
      if (id.startsWith("order_")) return;
      const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => markAsRead(n.id)));
    setLoading(false);
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Synthetic notifications (from orders) have "order_" prefix — just remove from UI
      if (id.startsWith("order_")) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        return;
      }
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        const notif = notifications.find((n) => n.id === id);
        if (notif && !notif.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "order_success":
        return <CheckCircle size={16} className="text-green-500 shrink-0" />;
      case "order_failed":
        return <XCircle size={16} className="text-red-500 shrink-0" />;
      case "ORDER_UPDATE":
        return <Package size={16} className="text-blue-500 shrink-0" />;
      case "MESSAGE":
        return <MessageSquare size={16} className="text-green-500 shrink-0" />;
      default:
        return <Info size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-full hover:bg-light-grey dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-navy dark:text-gray-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 shadow-xl z-50 overflow-hidden max-h-[70vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-gray-700">
              <h3 className="font-semibold text-navy dark:text-white text-sm">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-xs text-sky hover:text-sky/80 font-medium disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={32} />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      flex gap-3 px-4 py-3 border-b border-border/50 dark:border-gray-700/50 
                      transition-colors cursor-pointer
                      ${notification.isRead
                        ? "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750"
                        : "bg-sky/5 dark:bg-sky/10 hover:bg-sky/10 dark:hover:bg-sky/15"
                      }
                    `}
                    onClick={() => {
                      if (!notification.isRead) markAsRead(notification.id);
                    }}
                  >
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${
                          notification.isRead
                            ? "text-gray-600 dark:text-gray-400"
                            : "text-navy dark:text-white font-medium"
                        }`}>
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => deleteNotification(notification.id, e)}
                          className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors shrink-0 p-0.5"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {cleanBody(notification.body)}
                      </p>
                      {/* Action buttons for order notifications */}
                      {(notification.type === "order_success" || notification.type === "order_failed") && extractOrderId(notification.body) && (
                        <div className="flex gap-2 mt-1.5">
                          {notification.type === "order_success" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const oid = extractOrderId(notification.body);
                                if (oid) {
                                  setIsOpen(false);
                                  router.push(`/order/success?id=${oid}`);
                                }
                              }}
                              className="flex items-center gap-1 text-[11px] text-green-600 hover:text-green-800 font-medium"
                            >
                              <Printer size={11} />
                              View Receipt
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const oid = extractOrderId(notification.body);
                                if (oid) {
                                  setIsOpen(false);
                                  router.push(`/order/failed?id=${oid}`);
                                }
                              }}
                              className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 font-medium"
                            >
                              <ExternalLink size={11} />
                              View Details
                            </button>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
