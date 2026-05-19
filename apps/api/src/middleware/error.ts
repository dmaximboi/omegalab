import { Request, Response, NextFunction } from "express";

// ===========================================
// ERROR HANDLER
// NEVER expose raw errors to users
// ===========================================

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Please check your input and try again.",
  NOT_FOUND: "The requested resource was not found.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have permission to perform this action.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  PAYMENT_FAILED: "Payment could not be processed. Please try again.",
  DATABASE_ERROR: "We're experiencing technical difficulties. Please try again.",
  NETWORK_ERROR: "Could not connect to the server. Please check your connection.",
  DEFAULT: "Something went wrong. Please try again.",
};

// Patterns that indicate sensitive errors (never expose these)
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /prisma/i,
  /database/i,
  /sql/i,
  /query/i,
  /connection/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
];

function isSensitiveError(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

function getPublicMessage(err: AppError): string {
  // If it's an operational error with a safe message, use it
  if (err.isOperational && !isSensitiveError(err.message)) {
    return err.message;
  }

  // Map known error types to user-friendly messages
  if (err.message.includes("validation")) return ERROR_MESSAGES.VALIDATION_ERROR;
  if (err.message.includes("not found")) return ERROR_MESSAGES.NOT_FOUND;
  if (err.message.includes("unauthorized")) return ERROR_MESSAGES.UNAUTHORIZED;
  if (err.message.includes("forbidden")) return ERROR_MESSAGES.FORBIDDEN;
  if (err.message.includes("rate limit")) return ERROR_MESSAGES.RATE_LIMITED;
  if (err.message.includes("payment")) return ERROR_MESSAGES.PAYMENT_FAILED;

  // Default safe message
  return ERROR_MESSAGES.DEFAULT;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.headers["x-request-id"] || "unknown";
  const statusCode = err.statusCode || 500;

  // Log the FULL error server-side (for debugging)
  console.error(`[ERROR] [${requestId}]`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Send SANITIZED error to client
  res.status(statusCode).json({
    error: getPublicMessage(err),
    requestId, // Include for support reference
  });
}

// ===========================================
// CUSTOM ERROR CLASSES
// ===========================================
export class ValidationError extends Error {
  statusCode = 400;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  isOperational = true;

  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  isOperational = true;

  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  isOperational = true;

  constructor(message = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}
