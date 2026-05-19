// ============================================
// VALIDATION MODULE - 10 Security Functions
// ============================================
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { z } from "zod";

const window = new JSDOM("").window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purify = DOMPurify(window as any);

// 1. Sanitize HTML (DOMPurify)
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  return purify.sanitize(input.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// 2. Detect XSS
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi, /on\w+\s*=/gi, /data:/gi, /vbscript:/gi,
];
export function detectXss(input: string): boolean {
  if (!input) return false;
  return XSS_PATTERNS.some((p) => p.test(input));
}

// 3. Detect SQL Injection
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION)\b)/gi,
  /(--)|(\/\*)|(\*\/)/g, /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
];
export function detectSqlInjection(input: string): boolean {
  if (!input) return false;
  return SQL_PATTERNS.some((p) => p.test(input));
}

// 4. Validate Email
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email) && email.length <= 255;
}

// 5. Validate Nigerian Phone
export function isValidNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return /^(234|0)(70|80|81|90|91|71)\d{8}$/.test(cleaned);
}

// 6. Validate URL
export function isValidHttpsUrl(url: string): boolean {
  try { return new URL(url).protocol === "https:"; } catch { return false; }
}

// 7. Validate File Type
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function isAllowedImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());
}

// 8. Validate File Size
export function isFileSizeValid(size: number, maxMB: number = 5): boolean {
  return size > 0 && size <= maxMB * 1024 * 1024;
}

// 9. Escape HTML
export function escapeHtml(input: string): string {
  if (!input) return "";
  return input.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;");
}

// 10. Safe JSON Parse
export function safeJsonParse<T>(str: string, fallback: T): T {
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

// 11. Zod Schemas
export const emailSchema = z.string().email().max(255);
export const phoneSchema = z.string().min(10).max(20);
export const nameSchema = z.string().min(1).max(100).trim();
export const passwordSchema = z.string().min(8).max(128);
export const priceSchema = z.number().positive().max(1000000000);
export const quantitySchema = z.number().int().min(1).max(1000);

// 12. Validate with Schema
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: result.error.errors.map((e: z.ZodIssue) => e.message) };
}
