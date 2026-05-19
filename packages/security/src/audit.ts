// ============================================
// AUDIT & LOGGING MODULE - 10 Security Functions
// ============================================

// 1. Log Levels
export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

// 2. Security Event Types
export type SecurityEventType =
  | "LOGIN_SUCCESS" | "LOGIN_FAILURE" | "LOGOUT"
  | "PASSWORD_CHANGE" | "PASSWORD_RESET"
  | "ADMIN_ACTION" | "PERMISSION_DENIED"
  | "RATE_LIMIT_HIT" | "SUSPICIOUS_ACTIVITY"
  | "PAYMENT_INITIATED" | "PAYMENT_SUCCESS" | "PAYMENT_FAILURE"
  | "DATA_ACCESS" | "DATA_MODIFICATION" | "DATA_DELETION";

// 3. Log Entry Interface
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  event: SecurityEventType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// 4. Create Log Entry
export function createLogEntry(
  level: LogLevel,
  event: SecurityEventType,
  message: string,
  options?: Partial<Omit<LogEntry, "timestamp" | "level" | "event" | "message">>
): LogEntry {
  return {
    timestamp: new Date(),
    level,
    event,
    message,
    ...options,
  };
}

// 5. PII Redaction
const PII_PATTERNS: [RegExp, string][] = [
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]"],
  [/\b\d{10,11}\b/g, "[PHONE]"],
  [/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, "[CARD]"],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]"],
];

export function redactPii(text: string): string {
  let result = text;
  for (const [pattern, replacement] of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// 6. Error Sanitization (never expose raw errors to users)
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Log the real error server-side
    console.error("[INTERNAL ERROR]", error.message, error.stack);
  }
  // Return generic message to user
  return "An unexpected error occurred. Please try again.";
}

// 7. Admin Action Logger
export interface AdminAction {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress: string;
  timestamp: Date;
}

export function createAdminActionLog(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  ipAddress: string,
  oldValue?: unknown,
  newValue?: unknown
): AdminAction {
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

// 8. Access Log Entry
export interface AccessLogEntry {
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userId?: string;
}

export function createAccessLog(
  method: string,
  path: string,
  statusCode: number,
  responseTime: number,
  ipAddress: string,
  userId?: string
): AccessLogEntry {
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

// 9. Compliance Log (GDPR, etc.)
export type ComplianceAction = "DATA_EXPORT" | "DATA_DELETION" | "CONSENT_GIVEN" | "CONSENT_WITHDRAWN";

export interface ComplianceLog {
  timestamp: Date;
  userId: string;
  action: ComplianceAction;
  details: string;
  ipAddress: string;
}

export function createComplianceLog(
  userId: string,
  action: ComplianceAction,
  details: string,
  ipAddress: string
): ComplianceLog {
  return {
    timestamp: new Date(),
    userId,
    action,
    details,
    ipAddress,
  };
}

// 10. Data Retention Policy
export interface RetentionPolicy {
  entityType: string;
  retentionDays: number;
  softDelete: boolean;
}

export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  { entityType: "audit_logs", retentionDays: 365, softDelete: false },
  { entityType: "access_logs", retentionDays: 90, softDelete: false },
  { entityType: "security_events", retentionDays: 180, softDelete: false },
  { entityType: "user_data", retentionDays: 730, softDelete: true },
];

// 11. Alert Threshold
export interface AlertThreshold {
  event: SecurityEventType;
  threshold: number;
  windowMinutes: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  { event: "LOGIN_FAILURE", threshold: 5, windowMinutes: 15 },
  { event: "RATE_LIMIT_HIT", threshold: 10, windowMinutes: 5 },
  { event: "SUSPICIOUS_ACTIVITY", threshold: 3, windowMinutes: 60 },
  { event: "PAYMENT_FAILURE", threshold: 3, windowMinutes: 30 },
];

// 12. Format Log for Output
export function formatLogEntry(entry: LogEntry): string {
  const timestamp = entry.timestamp.toISOString();
  const level = entry.level.toUpperCase().padEnd(8);
  const event = entry.event.padEnd(25);
  const user = entry.userId ? `[${entry.userId}]` : "[anonymous]";
  return `${timestamp} ${level} ${event} ${user} ${entry.message}`;
}
