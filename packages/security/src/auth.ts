// ============================================
// AUTH MODULE - 10 Security Functions
// ============================================
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";

// 1. Role-Based Access Control
export type Role = "USER" | "ADMIN";
export type Permission = "read" | "write" | "delete" | "admin";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  USER: ["read"],
  ADMIN: ["read", "write", "delete", "admin"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// 2. Check Admin Role
export function isAdmin(role: string | undefined): boolean {
  return role === "ADMIN";
}

// 3. Check Admin Email
export function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

// 4. Account Lockout Check
export function isAccountLocked(failedAttempts: number, lockedUntil: Date | null): boolean {
  if (lockedUntil && new Date() < lockedUntil) return true;
  return failedAttempts >= 5;
}

// 5. Calculate Lockout Duration
export function calculateLockoutDuration(failedAttempts: number): number {
  const baseMinutes = 5;
  const multiplier = Math.min(failedAttempts - 4, 6);
  return baseMinutes * Math.pow(2, multiplier) * 60 * 1000;
}

// 6. Generate Session Token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// 7. Create JWT
export async function createJwt(payload: Record<string, unknown>, secret: string, expiresIn: string = "1h"): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

// 8. Verify JWT
export async function verifyJwt<T>(token: string, secret: string): Promise<T | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload as T;
  } catch { return null; }
}

// 9. Device Fingerprint
export function generateDeviceFingerprint(userAgent: string, ip: string, acceptLanguage: string): string {
  const data = `${userAgent}|${ip}|${acceptLanguage}`;
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 32);
}

// 10. Session Hijack Detection
export function detectSessionHijack(
  storedFingerprint: string,
  currentFingerprint: string,
  storedIp: string,
  currentIp: string
): boolean {
  if (storedFingerprint !== currentFingerprint) return true;
  if (storedIp !== currentIp) return true;
  return false;
}

// 11. Generate MFA Code
export function generateMfaCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// 12. Validate MFA Code
export function validateMfaCode(input: string, expected: string, expiresAt: Date): boolean {
  if (new Date() > expiresAt) return false;
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}
