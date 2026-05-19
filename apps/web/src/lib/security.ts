import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * SECURITY UTILITIES
 * All security-critical functions for the application
 */

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize string input - removes dangerous characters
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  if (typeof input !== "string") return "";
  
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, "") // Remove HTML brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .replace(/data:/gi, "") // Remove data: protocol
    .trim();
}

/**
 * Sanitize email - strict validation
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== "string") return null;
  
  const cleaned = email.toLowerCase().trim().slice(0, 254);
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  
  return emailRegex.test(cleaned) ? cleaned : null;
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string | null {
  if (typeof phone !== "string") return null;
  
  const cleaned = phone.replace(/[^\d+\-\s()]/g, "").slice(0, 20);
  return cleaned.length >= 10 ? cleaned : null;
}

// ============================================
// FILE UPLOAD SECURITY
// ============================================

// Allowed file types with their magic bytes (file signatures)
const ALLOWED_FILE_TYPES: Record<string, { mimeTypes: string[]; magicBytes: number[][] }> = {
  image: {
    mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    magicBytes: [
      [0xFF, 0xD8, 0xFF], // JPEG
      [0x89, 0x50, 0x4E, 0x47], // PNG
      [0x47, 0x49, 0x46], // GIF
      [0x52, 0x49, 0x46, 0x46], // WEBP (RIFF header)
    ],
  },
  document: {
    mimeTypes: ["application/pdf"],
    magicBytes: [
      [0x25, 0x50, 0x44, 0x46], // PDF
    ],
  },
};

// Dangerous file extensions that should NEVER be allowed
const DANGEROUS_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
  ".js", ".jse", ".vbs", ".vbe", ".wsf", ".wsh",
  ".ps1", ".psm1", ".psd1",
  ".php", ".php3", ".php4", ".php5", ".phtml",
  ".asp", ".aspx", ".ashx", ".asmx",
  ".jsp", ".jspx",
  ".cgi", ".pl", ".py", ".rb",
  ".sh", ".bash", ".zsh",
  ".dll", ".so", ".dylib",
  ".jar", ".war", ".ear",
  ".svg", // Can contain scripts
  ".html", ".htm", ".xhtml",
  ".xml", ".xsl", ".xslt",
];

/**
 * Validate file upload - checks extension, MIME type, and magic bytes
 */
export async function validateFileUpload(
  file: File,
  allowedCategory: "image" | "document" = "image",
  maxSizeBytes = 5 * 1024 * 1024 // 5MB default
): Promise<{ valid: boolean; error?: string }> {
  // Check file size
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File too large. Maximum size is ${maxSizeBytes / 1024 / 1024}MB` };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  // Check filename for dangerous extensions
  const fileName = file.name.toLowerCase();
  for (const ext of DANGEROUS_EXTENSIONS) {
    if (fileName.endsWith(ext) || fileName.includes(ext + ".")) {
      return { valid: false, error: "File type not allowed" };
    }
  }

  // Check MIME type
  const allowedConfig = ALLOWED_FILE_TYPES[allowedCategory];
  if (!allowedConfig.mimeTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedConfig.mimeTypes.join(", ")}` };
  }

  // Read first bytes to verify magic bytes (file signature)
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    let magicBytesMatch = false;
    for (const signature of allowedConfig.magicBytes) {
      if (signature.every((byte, index) => bytes[index] === byte)) {
        magicBytesMatch = true;
        break;
      }
    }

    if (!magicBytesMatch) {
      return { valid: false, error: "File content does not match declared type" };
    }
  } catch {
    return { valid: false, error: "Could not verify file content" };
  }

  // Additional check: scan for embedded scripts in images
  try {
    const textContent = await file.slice(0, Math.min(file.size, 10000)).text();
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<\?php/i,
      /<%/,
      /eval\s*\(/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(textContent)) {
        return { valid: false, error: "File contains potentially malicious content" };
      }
    }
  } catch {
    // Text extraction failed, which is fine for binary files
  }

  return { valid: true };
}

/**
 * Generate secure filename - removes path traversal and special characters
 */
export function generateSecureFilename(originalName: string): string {
  // Extract extension
  const lastDot = originalName.lastIndexOf(".");
  const ext = lastDot > 0 ? originalName.slice(lastDot).toLowerCase() : "";
  
  // Generate random filename
  const randomPart = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  
  return `${timestamp}-${randomPart}${ext}`;
}

// ============================================
// RATE LIMITING
// ============================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter
 */
export function checkRateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetTime - now };
}

// ============================================
// CSRF PROTECTION
// ============================================

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken || token.length !== storedToken.length) {
    return false;
  }
  
  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
  } catch {
    return false;
  }
}

// ============================================
// REQUEST VALIDATION
// ============================================

/**
 * Validate request origin
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // Allow requests with no origin (same-origin requests)
  if (!origin) return true;

  // Check if origin matches host
  try {
    const originUrl = new URL(origin);
    const allowedHosts = [
      "localhost",
      "127.0.0.1",
      host?.split(":")[0],
      process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : null,
    ].filter(Boolean);

    return allowedHosts.includes(originUrl.hostname);
  } catch {
    return false;
  }
}

/**
 * Get client IP address
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  return realIP || "unknown";
}

// ============================================
// SECURE RESPONSE HELPERS
// ============================================

/**
 * Create secure JSON response with security headers
 */
export function secureJsonResponse(
  data: unknown,
  status = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  
  return response;
}

/**
 * Create error response (never expose internal errors)
 */
export function errorResponse(
  message: string,
  status = 400
): NextResponse {
  // Never expose stack traces or internal details
  const safeMessage = message.length > 200 ? "An error occurred" : message;
  
  return secureJsonResponse({ error: safeMessage }, status);
}
