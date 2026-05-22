"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = hasPermission;
exports.isAdmin = isAdmin;
exports.isAdminEmail = isAdminEmail;
exports.isAccountLocked = isAccountLocked;
exports.calculateLockoutDuration = calculateLockoutDuration;
exports.generateSessionToken = generateSessionToken;
exports.createJwt = createJwt;
exports.verifyJwt = verifyJwt;
exports.generateDeviceFingerprint = generateDeviceFingerprint;
exports.detectSessionHijack = detectSessionHijack;
exports.generateMfaCode = generateMfaCode;
exports.validateMfaCode = validateMfaCode;
// ============================================
// AUTH MODULE - 10 Security Functions
// ============================================
const crypto_1 = __importDefault(require("crypto"));
const jose_1 = require("jose");
const ROLE_PERMISSIONS = {
    USER: ["read"],
    ADMIN: ["read", "write", "delete", "admin"],
};
function hasPermission(role, permission) {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
// 2. Check Admin Role
function isAdmin(role) {
    return role === "ADMIN";
}
// 3. Check Admin Email
function isAdminEmail(email) {
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
    return adminEmails.includes(email.toLowerCase());
}
// 4. Account Lockout Check
function isAccountLocked(failedAttempts, lockedUntil) {
    if (lockedUntil && new Date() < lockedUntil)
        return true;
    return failedAttempts >= 5;
}
// 5. Calculate Lockout Duration
function calculateLockoutDuration(failedAttempts) {
    const baseMinutes = 5;
    const multiplier = Math.min(failedAttempts - 4, 6);
    return baseMinutes * Math.pow(2, multiplier) * 60 * 1000;
}
// 6. Generate Session Token
function generateSessionToken() {
    return crypto_1.default.randomBytes(32).toString("base64url");
}
// 7. Create JWT
async function createJwt(payload, secret, expiresIn = "1h") {
    const secretKey = new TextEncoder().encode(secret);
    return new jose_1.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(secretKey);
}
// 8. Verify JWT
async function verifyJwt(token, secret) {
    try {
        const secretKey = new TextEncoder().encode(secret);
        const { payload } = await (0, jose_1.jwtVerify)(token, secretKey);
        return payload;
    }
    catch {
        return null;
    }
}
// 9. Device Fingerprint
function generateDeviceFingerprint(userAgent, ip, acceptLanguage) {
    const data = `${userAgent}|${ip}|${acceptLanguage}`;
    return crypto_1.default.createHash("sha256").update(data).digest("hex").slice(0, 32);
}
// 10. Session Hijack Detection
function detectSessionHijack(storedFingerprint, currentFingerprint, storedIp, currentIp) {
    if (storedFingerprint !== currentFingerprint)
        return true;
    if (storedIp !== currentIp)
        return true;
    return false;
}
// 11. Generate MFA Code
function generateMfaCode() {
    return crypto_1.default.randomInt(100000, 999999).toString();
}
// 12. Validate MFA Code
function validateMfaCode(input, expected, expiresAt) {
    if (new Date() > expiresAt)
        return false;
    return crypto_1.default.timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}
