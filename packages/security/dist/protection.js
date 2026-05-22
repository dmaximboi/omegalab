"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHoneypotTriggered = isHoneypotTriggered;
exports.isLikelyBot = isLikelyBot;
exports.isIpBlacklisted = isIpBlacklisted;
exports.addToBlacklist = addToBlacklist;
exports.removeFromBlacklist = removeFromBlacklist;
exports.isValidUserAgent = isValidUserAgent;
exports.generateRequestFingerprint = generateRequestFingerprint;
exports.isCountryBlocked = isCountryBlocked;
exports.blockCountry = blockCountry;
exports.isTorExitNode = isTorExitNode;
exports.detectProxyHeaders = detectProxyHeaders;
exports.calculateAbuseScore = calculateAbuseScore;
exports.isTimingAnomaly = isTimingAnomaly;
exports.verifyCaptcha = verifyCaptcha;
exports.hasSuspiciousPatterns = hasSuspiciousPatterns;
// ============================================
// PROTECTION MODULE - 10 Security Functions
// ============================================
const crypto_1 = __importDefault(require("crypto"));
// 1. Honeypot Field Check
function isHoneypotTriggered(honeypotValue) {
    return !!honeypotValue && honeypotValue.length > 0;
}
// 2. Bot Detection (basic)
const BOT_PATTERNS = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
    /python-requests/i, /axios/i, /node-fetch/i, /postman/i,
];
function isLikelyBot(userAgent) {
    if (!userAgent)
        return true;
    return BOT_PATTERNS.some((p) => p.test(userAgent));
}
// 3. IP Blacklist Check
const BLACKLISTED_IPS = new Set();
function isIpBlacklisted(ip) {
    return BLACKLISTED_IPS.has(ip);
}
function addToBlacklist(ip) {
    BLACKLISTED_IPS.add(ip);
}
function removeFromBlacklist(ip) {
    BLACKLISTED_IPS.delete(ip);
}
// 4. User Agent Validation
function isValidUserAgent(userAgent) {
    if (!userAgent)
        return false;
    if (userAgent.length < 10 || userAgent.length > 500)
        return false;
    return true;
}
// 5. Request Fingerprint
function generateRequestFingerprint(ip, userAgent, acceptLanguage) {
    const data = `${ip}|${userAgent}|${acceptLanguage}`;
    return crypto_1.default.createHash("sha256").update(data).digest("hex").slice(0, 32);
}
// 6. Geo Blocking (country codes)
const BLOCKED_COUNTRIES = new Set();
function isCountryBlocked(countryCode) {
    return BLOCKED_COUNTRIES.has(countryCode.toUpperCase());
}
function blockCountry(countryCode) {
    BLOCKED_COUNTRIES.add(countryCode.toUpperCase());
}
// 7. Tor Exit Node Detection (basic check)
function isTorExitNode(ip) {
    // In production, check against Tor exit node list
    // This is a placeholder - integrate with actual Tor exit node API
    return false;
}
// 8. Proxy Detection Headers
const PROXY_HEADERS = [
    "x-forwarded-for", "via", "x-proxy-id", "x-real-ip",
    "forwarded", "x-cluster-client-ip", "true-client-ip",
];
function detectProxyHeaders(headers) {
    const headerKeys = Object.keys(headers).map(h => h.toLowerCase());
    const proxyCount = PROXY_HEADERS.filter(h => headerKeys.includes(h)).length;
    return proxyCount >= 3;
}
function calculateAbuseScore(signals) {
    let score = 0;
    score += Math.min(signals.failedLogins * 10, 30);
    score += Math.min(signals.rateLimitHits * 5, 25);
    score += Math.min(signals.suspiciousRequests * 15, 30);
    if (signals.accountAge < 1)
        score += 15;
    else if (signals.accountAge < 7)
        score += 10;
    return Math.min(score, 100);
}
// 10. Request Timing Anomaly
function isTimingAnomaly(requestTimes, threshold = 50) {
    if (requestTimes.length < 3)
        return false;
    const intervals = [];
    for (let i = 1; i < requestTimes.length; i++) {
        intervals.push(requestTimes[i] - requestTimes[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return avgInterval < threshold; // Too fast = likely automated
}
// 11. CAPTCHA Token Validation (placeholder)
async function verifyCaptcha(token, secret) {
    if (!token || !secret)
        return false;
    try {
        const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${secret}&response=${token}`,
        });
        const data = await response.json();
        return data.success;
    }
    catch {
        return false;
    }
}
// 12. Suspicious Pattern Detection
const SUSPICIOUS_PATTERNS = [
    /\.\.\//g, // Path traversal
    /%00/g, // Null byte
    /<script/gi, // XSS attempt
    /union\s+select/gi, // SQL injection
];
function hasSuspiciousPatterns(input) {
    return SUSPICIOUS_PATTERNS.some((p) => p.test(input));
}
