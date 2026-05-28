"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, Package, MessageSquare, Info } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
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

  // Fetch on mount + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

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

  const getIcon = (type: string) => {
    switch (type) {
      case "ORDER_UPDATE":
        return <Package size={16} className="text-blue-500 shrink-0" />;
      case "MESSAGE":
        return <MessageSquare size={16} className="text-green-500 shrink-0" />;
      default:
        return <Info size={16} className="text-gray-400 shrink-0" />;
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
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-sky shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
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
