"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.generateSalt = generateSalt;
exports.hmacSha256 = hmacSha256;
exports.timingSafeEqual = timingSafeEqual;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.generateSecureToken = generateSecureToken;
exports.generateTxRef = generateTxRef;
exports.generateReceiptHash = generateReceiptHash;
exports.deriveKey = deriveKey;
exports.generateCsrfToken = generateCsrfToken;
exports.verifyHmac = verifyHmac;
// ============================================
// CRYPTO MODULE - 10 Security Functions
// ============================================
const crypto_1 = __importDefault(require("crypto"));
// 1. SHA-256 Hash
function sha256(data) {
    return crypto_1.default.createHash("sha256").update(data).digest("hex");
}
// 2. Generate Salt
function generateSalt(length = 32) {
    return crypto_1.default.randomBytes(length).toString("hex");
}
// 3. HMAC-SHA256
function hmacSha256(data, secret) {
    return crypto_1.default.createHmac("sha256", secret).update(data).digest("hex");
}
// 4. Timing-Safe Comparison
function timingSafeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string")
        return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        crypto_1.default.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
        return false;
    }
    return crypto_1.default.timingSafeEqual(bufA, bufB);
}
// 5. AES-256-GCM Encryption
function encrypt(plaintext, key) {
    const keyBuffer = crypto_1.default.scryptSync(key, "omega-salt", 32);
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv("aes-256-gcm", keyBuffer, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();
    return iv.toString("hex") + ":" + encrypted + ":" + tag.toString("hex");
}
// 6. AES-256-GCM Decryption
function decrypt(ciphertext, key) {
    try {
        const [ivHex, encrypted, tagHex] = ciphertext.split(":");
        const keyBuffer = crypto_1.default.scryptSync(key, "omega-salt", 32);
        const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", keyBuffer, Buffer.from(ivHex, "hex"));
        decipher.setAuthTag(Buffer.from(tagHex, "hex"));
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    }
    catch {
        return null;
    }
}
// 7. Generate Secure Token
function generateSecureToken(length = 32) {
    return crypto_1.default.randomBytes(length).toString("base64url");
}
// 8. Generate Transaction Reference
function generateTxRef() {
    const timestamp = Date.now().toString(36);
    const random = crypto_1.default.randomBytes(8).toString("hex");
    return `TX-${timestamp}-${random}`.toUpperCase();
}
// 9. Generate Receipt Hash
function generateReceiptHash(txRef, userId, amount, salt) {
    return sha256(`${txRef}:${userId}:${amount}:${salt}`);
}
// 10. Key Derivation (PBKDF2)
function deriveKey(password, salt, iterations = 100000) {
    return crypto_1.default.pbkdf2Sync(password, salt, iterations, 32, "sha256");
}
// 11. Generate CSRF Token
function generateCsrfToken() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
// 12. Verify HMAC
function verifyHmac(data, secret, expectedHmac) {
    const computed = hmacSha256(data, secret);
    return timingSafeEqual(computed, expectedHmac);
}
