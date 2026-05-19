// ============================================
// @omega/ui - Shared UI Utilities
// ============================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export const buttonVariants = {
  primary: "bg-navy text-white hover:bg-navy/90 focus:ring-navy",
  secondary: "bg-sky text-white hover:bg-sky/90 focus:ring-sky",
  outline: "border border-navy/20 text-navy hover:bg-navy/5 focus:ring-navy/20",
  ghost: "text-navy hover:bg-navy/5",
};

export const buttonSizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function getButtonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
    buttonVariants[variant],
    buttonSizes[size]
  );
}
