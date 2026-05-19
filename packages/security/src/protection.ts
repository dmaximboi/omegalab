// ============================================
// PROTECTION MODULE - 10 Security Functions
// ============================================
import crypto from "crypto";

// 1. Honeypot Field Check
export function isHoneypotTriggered(honeypotValue: string | undefined): boolean {
  return !!honeypotValue && honeypotValue.length > 0;
}

// 2. Bot Detection (basic)
const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
  /python-requests/i, /axios/i, /node-fetch/i, /postman/i,
];

export function isLikelyBot(userAgent: string): boolean {
  if (!userAgent) return true;
  return BOT_PATTERNS.some((p) => p.test(userAgent));
}

// 3. IP Blacklist Check
const BLACKLISTED_IPS = new Set<string>();

export function isIpBlacklisted(ip: string): boolean {
  return BLACKLISTED_IPS.has(ip);
}

export function addToBlacklist(ip: string): void {
  BLACKLISTED_IPS.add(ip);
}

export function removeFromBlacklist(ip: string): void {
  BLACKLISTED_IPS.delete(ip);
}

// 4. User Agent Validation
export function isValidUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  if (userAgent.length < 10 || userAgent.length > 500) return false;
  return true;
}

// 5. Request Fingerprint
export function generateRequestFingerprint(ip: string, userAgent: string, acceptLanguage: string): string {
  const data = `${ip}|${userAgent}|${acceptLanguage}`;
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 32);
}

// 6. Geo Blocking (country codes)
const BLOCKED_COUNTRIES = new Set<string>();

export function isCountryBlocked(countryCode: string): boolean {
  return BLOCKED_COUNTRIES.has(countryCode.toUpperCase());
}

export function blockCountry(countryCode: string): void {
  BLOCKED_COUNTRIES.add(countryCode.toUpperCase());
}

// 7. Tor Exit Node Detection (basic check)
export function isTorExitNode(ip: string): boolean {
  // In production, check against Tor exit node list
  // This is a placeholder - integrate with actual Tor exit node API
  return false;
}

// 8. Proxy Detection Headers
const PROXY_HEADERS = [
  "x-forwarded-for", "via", "x-proxy-id", "x-real-ip",
  "forwarded", "x-cluster-client-ip", "true-client-ip",
];

export function detectProxyHeaders(headers: Record<string, string>): boolean {
  const headerKeys = Object.keys(headers).map(h => h.toLowerCase());
  const proxyCount = PROXY_HEADERS.filter(h => headerKeys.includes(h)).length;
  return proxyCount >= 3;
}

// 9. Abuse Scoring
export interface AbuseSignals {
  failedLogins: number;
  rateLimitHits: number;
  suspiciousRequests: number;
  accountAge: number; // days
}

export function calculateAbuseScore(signals: AbuseSignals): number {
  let score = 0;
  score += Math.min(signals.failedLogins * 10, 30);
  score += Math.min(signals.rateLimitHits * 5, 25);
  score += Math.min(signals.suspiciousRequests * 15, 30);
  if (signals.accountAge < 1) score += 15;
  else if (signals.accountAge < 7) score += 10;
  return Math.min(score, 100);
}

// 10. Request Timing Anomaly
export function isTimingAnomaly(requestTimes: number[], threshold: number = 50): boolean {
  if (requestTimes.length < 3) return false;
  const intervals: number[] = [];
  for (let i = 1; i < requestTimes.length; i++) {
    intervals.push(requestTimes[i] - requestTimes[i - 1]);
  }
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return avgInterval < threshold; // Too fast = likely automated
}

// 11. CAPTCHA Token Validation (placeholder)
export async function verifyCaptcha(token: string, secret: string): Promise<boolean> {
  if (!token || !secret) return false;
  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${token}`,
    });
    const data = await response.json() as { success: boolean };
    return data.success;
  } catch { return false; }
}

// 12. Suspicious Pattern Detection
const SUSPICIOUS_PATTERNS = [
  /\.\.\//g, // Path traversal
  /%00/g, // Null byte
  /<script/gi, // XSS attempt
  /union\s+select/gi, // SQL injection
];

export function hasSuspiciousPatterns(input: string): boolean {
  return SUSPICIOUS_PATTERNS.some((p) => p.test(input));
}
