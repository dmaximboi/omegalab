// ============================================
// @omega/config - Shared Configuration
// ============================================

export const APP_CONFIG = {
  name: "De-Omega Labaffairs",
  shortName: "De-Omega",
  description: "Laboratory and medical equipment solutions in Nigeria",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  apiUrl: process.env.API_URL || "http://localhost:4000",
};

export const COLORS = {
  navy: "#0A1F5C",
  sky: "#00AAFF",
  white: "#FFFFFF",
  lightGrey: "#F4F6FA",
  border: "#E5E7EB",
};

export const FONTS = {
  body: "DM Sans, system-ui, sans-serif",
  heading: "Syne, system-ui, sans-serif",
};

export const LIMITS = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxImageWidth: 2000,
  maxImageHeight: 2000,
  maxCartItems: 50,
  maxOrderQuantity: 100,
  contactMessageMaxLength: 2000,
  productDescriptionMaxLength: 5000,
};

export const RATE_LIMITS = {
  contact: { requests: 3, window: "1h" },
  auth: { requests: 10, window: "15m" },
  order: { requests: 20, window: "1h" },
  api: { requests: 100, window: "1m" },
  admin: { requests: 200, window: "1m" },
};

export const CURRENCIES = {
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  USD: { symbol: "$", name: "US Dollar" },
};

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const USER_ROLES = ["USER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];
