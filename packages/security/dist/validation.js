"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quantitySchema = exports.priceSchema = exports.passwordSchema = exports.nameSchema = exports.phoneSchema = exports.emailSchema = void 0;
exports.sanitizeHtml = sanitizeHtml;
exports.detectXss = detectXss;
exports.detectSqlInjection = detectSqlInjection;
exports.isValidEmail = isValidEmail;
exports.isValidNigerianPhone = isValidNigerianPhone;
exports.isValidHttpsUrl = isValidHttpsUrl;
exports.isAllowedImageType = isAllowedImageType;
exports.isFileSizeValid = isFileSizeValid;
exports.escapeHtml = escapeHtml;
exports.safeJsonParse = safeJsonParse;
exports.validateSchema = validateSchema;
// ============================================
// VALIDATION MODULE - 10 Security Functions
// ============================================
const dompurify_1 = __importDefault(require("dompurify"));
const jsdom_1 = require("jsdom");
const zod_1 = require("zod");
const window = new jsdom_1.JSDOM("").window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purify = (0, dompurify_1.default)(window);
// 1. Sanitize HTML (DOMPurify)
function sanitizeHtml(input) {
    if (!input)
        return "";
    return purify.sanitize(input.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
// 2. Detect XSS
const XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi, /on\w+\s*=/gi, /data:/gi, /vbscript:/gi,
];
function detectXss(input) {
    if (!input)
        return false;
    return XSS_PATTERNS.some((p) => p.test(input));
}
// 3. Detect SQL Injection
const SQL_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION)\b)/gi,
    /(--)|(\/\*)|(\*\/)/g, /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
];
function detectSqlInjection(input) {
    if (!input)
        return false;
    return SQL_PATTERNS.some((p) => p.test(input));
}
// 4. Validate Email
function isValidEmail(email) {
    if (!email)
        return false;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email) && email.length <= 255;
}
// 5. Validate Nigerian Phone
function isValidNigerianPhone(phone) {
    const cleaned = phone.replace(/\D/g, "");
    return /^(234|0)(70|80|81|90|91|71)\d{8}$/.test(cleaned);
}
// 6. Validate URL
function isValidHttpsUrl(url) {
    try {
        return new URL(url).protocol === "https:";
    }
    catch {
        return false;
    }
}
// 7. Validate File Type
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
function isAllowedImageType(mimeType) {
    return ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());
}
// 8. Validate File Size
function isFileSizeValid(size, maxMB = 5) {
    return size > 0 && size <= maxMB * 1024 * 1024;
}
// 9. Escape HTML
function escapeHtml(input) {
    if (!input)
        return "";
    return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
// 10. Safe JSON Parse
function safeJsonParse(str, fallback) {
    try {
        return JSON.parse(str);
    }
    catch {
        return fallback;
    }
}
// 11. Zod Schemas
exports.emailSchema = zod_1.z.string().email().max(255);
exports.phoneSchema = zod_1.z.string().min(10).max(20);
exports.nameSchema = zod_1.z.string().min(1).max(100).trim();
exports.passwordSchema = zod_1.z.string().min(8).max(128);
exports.priceSchema = zod_1.z.number().positive().max(1000000000);
exports.quantitySchema = zod_1.z.number().int().min(1).max(1000);
// 12. Validate with Schema
function validateSchema(schema, data) {
    const result = schema.safeParse(data);
    if (result.success)
        return { success: true, data: result.data };
    return { success: false, errors: result.error.errors.map((e) => e.message) };
}
