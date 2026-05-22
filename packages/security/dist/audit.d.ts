export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";
export type SecurityEventType = "LOGIN_SUCCESS" | "LOGIN_FAILURE" | "LOGOUT" | "PASSWORD_CHANGE" | "PASSWORD_RESET" | "ADMIN_ACTION" | "PERMISSION_DENIED" | "RATE_LIMIT_HIT" | "SUSPICIOUS_ACTIVITY" | "PAYMENT_INITIATED" | "PAYMENT_SUCCESS" | "PAYMENT_FAILURE" | "DATA_ACCESS" | "DATA_MODIFICATION" | "DATA_DELETION";
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
export declare function createLogEntry(level: LogLevel, event: SecurityEventType, message: string, options?: Partial<Omit<LogEntry, "timestamp" | "level" | "event" | "message">>): LogEntry;
export declare function redactPii(text: string): string;
export declare function sanitizeError(error: unknown): string;
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
export declare function createAdminActionLog(adminId: string, action: string, entityType: string, entityId: string, ipAddress: string, oldValue?: unknown, newValue?: unknown): AdminAction;
export interface AccessLogEntry {
    timestamp: Date;
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    ipAddress: string;
    userId?: string;
}
export declare function createAccessLog(method: string, path: string, statusCode: number, responseTime: number, ipAddress: string, userId?: string): AccessLogEntry;
export type ComplianceAction = "DATA_EXPORT" | "DATA_DELETION" | "CONSENT_GIVEN" | "CONSENT_WITHDRAWN";
export interface ComplianceLog {
    timestamp: Date;
    userId: string;
    action: ComplianceAction;
    details: string;
    ipAddress: string;
}
export declare function createComplianceLog(userId: string, action: ComplianceAction, details: string, ipAddress: string): ComplianceLog;
export interface RetentionPolicy {
    entityType: string;
    retentionDays: number;
    softDelete: boolean;
}
export declare const DEFAULT_RETENTION_POLICIES: RetentionPolicy[];
export interface AlertThreshold {
    event: SecurityEventType;
    threshold: number;
    windowMinutes: number;
}
export declare const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[];
export declare function formatLogEntry(entry: LogEntry): string;
