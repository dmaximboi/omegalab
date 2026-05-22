"use strict";
// ============================================
// AUDIT & LOGGING MODULE - 10 Security Functions
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ALERT_THRESHOLDS = exports.DEFAULT_RETENTION_POLICIES = void 0;
exports.createLogEntry = createLogEntry;
exports.redactPii = redactPii;
exports.sanitizeError = sanitizeError;
exports.createAdminActionLog = createAdminActionLog;
exports.createAccessLog = createAccessLog;
exports.createComplianceLog = createComplianceLog;
exports.formatLogEntry = formatLogEntry;
// 4. Create Log Entry
function createLogEntry(level, event, message, options) {
    return {
        timestamp: new Date(),
        level,
        event,
        message,
        ...options,
    };
}
// 5. PII Redaction
const PII_PATTERNS = [
    [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]"],
    [/\b\d{10,11}\b/g, "[PHONE]"],
    [/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, "[CARD]"],
    [/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]"],
];
function redactPii(text) {
    let result = text;
    for (const [pattern, replacement] of PII_PATTERNS) {
        result = result.replace(pattern, replacement);
    }
    return result;
}
// 6. Error Sanitization (never expose raw errors to users)
function sanitizeError(error) {
    if (error instanceof Error) {
        // Log the real error server-side
        console.error("[INTERNAL ERROR]", error.message, error.stack);
    }
    // Return generic message to user
    return "An unexpected error occurred. Please try again.";
}
function createAdminActionLog(adminId, action, entityType, entityId, ipAddress, oldValue, newValue) {
    return {
        adminId,
        action,
        entityType,
        entityId,
        oldValue,
        newValue,
        ipAddress,
        timestamp: new Date(),
    };
}
function createAccessLog(method, path, statusCode, responseTime, ipAddress, userId) {
    return {
        timestamp: new Date(),
        method,
        path,
        statusCode,
        responseTime,
        ipAddress,
        userId,
    };
}
function createComplianceLog(userId, action, details, ipAddress) {
    return {
        timestamp: new Date(),
        userId,
        action,
        details,
        ipAddress,
    };
}
exports.DEFAULT_RETENTION_POLICIES = [
    { entityType: "audit_logs", retentionDays: 365, softDelete: false },
    { entityType: "access_logs", retentionDays: 90, softDelete: false },
    { entityType: "security_events", retentionDays: 180, softDelete: false },
    { entityType: "user_data", retentionDays: 730, softDelete: true },
];
exports.DEFAULT_ALERT_THRESHOLDS = [
    { event: "LOGIN_FAILURE", threshold: 5, windowMinutes: 15 },
    { event: "RATE_LIMIT_HIT", threshold: 10, windowMinutes: 5 },
    { event: "SUSPICIOUS_ACTIVITY", threshold: 3, windowMinutes: 60 },
    { event: "PAYMENT_FAILURE", threshold: 3, windowMinutes: 30 },
];
// 12. Format Log for Output
function formatLogEntry(entry) {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(8);
    const event = entry.event.padEnd(25);
    const user = entry.userId ? `[${entry.userId}]` : "[anonymous]";
    return `${timestamp} ${level} ${event} ${user} ${entry.message}`;
}
