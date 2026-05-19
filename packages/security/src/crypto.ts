// ============================================
// CRYPTO MODULE - 10 Security Functions
// ============================================
import crypto from "crypto";

// 1. SHA-256 Hash
export function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// 2. Generate Salt
export function generateSalt(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

// 3. HMAC-SHA256
export function hmacSha256(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

// 4. Timing-Safe Comparison
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// 5. AES-256-GCM Encryption
export function encrypt(plaintext: string, key: string): string {
  const keyBuffer = crypto.scryptSync(key, "omega-salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + encrypted + ":" + tag.toString("hex");
}

// 6. AES-256-GCM Decryption
export function decrypt(ciphertext: string, key: string): string | null {
  try {
    const [ivHex, encrypted, tagHex] = ciphertext.split(":");
    const keyBuffer = crypto.scryptSync(key, "omega-salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch { return null; }
}

// 7. Generate Secure Token
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("base64url");
}

// 8. Generate Transaction Reference
export function generateTxRef(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString("hex");
  return `TX-${timestamp}-${random}`.toUpperCase();
}

// 9. Generate Receipt Hash
export function generateReceiptHash(txRef: string, userId: string, amount: string, salt: string): string {
  return sha256(`${txRef}:${userId}:${amount}:${salt}`);
}

// 10. Key Derivation (PBKDF2)
export function deriveKey(password: string, salt: string, iterations: number = 100000): Buffer {
  return crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
}

// 11. Generate CSRF Token
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// 12. Verify HMAC
export function verifyHmac(data: string, secret: string, expectedHmac: string): boolean {
  const computed = hmacSha256(data, secret);
  return timingSafeEqual(computed, expectedHmac);
}
