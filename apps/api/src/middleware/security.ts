import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ===========================================
// SECURITY MIDDLEWARE
// Integrates with @omega/security package
// ===========================================

// Rate limiting store (in production, use Redis via @omega/security)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Configuration
const RATE_LIMITS = {
  default: { requests: 100, windowMs: 60 * 1000 }, // 100 req/min
  auth: { requests: 10, windowMs: 15 * 60 * 1000 }, // 10 req/15min
  contact: { requests: 5, windowMs: 60 * 60 * 1000 }, // 5 req/hour
  admin: { requests: 200, windowMs: 60 * 1000 }, // 200 req/min
};

// Blocked IPs (in production, load from database)
const blockedIPs = new Set<string>();

// Suspicious patterns for SQL injection
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
  /(--|;|\/\*|\*\/|@@|@)/,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
];

// XSS patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];

// Get client IP
function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

// Check for SQL injection
function containsSQLInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

// Check for XSS
function containsXSS(value: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(value));
}

// Deep scan object for malicious content
function scanObject(obj: unknown, path = ""): string[] {
  const issues: string[] = [];

  if (typeof obj === "string") {
    if (containsSQLInjection(obj)) {
      issues.push(`SQL injection detected at ${path}`);
    }
    if (containsXSS(obj)) {
      issues.push(`XSS detected at ${path}`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      issues.push(...scanObject(item, `${path}[${index}]`));
    });
  } else if (obj && typeof obj === "object") {
    Object.entries(obj).forEach(([key, value]) => {
      issues.push(...scanObject(value, path ? `${path}.${key}` : key));
    });
  }

  return issues;
}

// Rate limiter
function checkRateLimit(ip: string, endpoint: string): { allowed: boolean; remaining: number } {
  const config = endpoint.includes("auth")
    ? RATE_LIMITS.auth
    : endpoint.includes("contact")
    ? RATE_LIMITS.contact
    : endpoint.includes("admin")
    ? RATE_LIMITS.admin
    : RATE_LIMITS.default;

  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.requests - 1 };
  }

  if (record.count >= config.requests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: config.requests - record.count };
}

// Generate request ID for tracing
function generateRequestId(): string {
  return crypto.randomBytes(8).toString("hex");
}

// ===========================================
// MAIN SECURITY MIDDLEWARE
// ===========================================
export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIP(req);
  const requestId = generateRequestId();

  // Attach request ID for logging
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-ID", requestId);

  // 1. Check if IP is blocked
  if (blockedIPs.has(ip)) {
    console.warn(`[SECURITY] Blocked IP attempted access: ${ip}`);
    return res.status(403).json({ error: "Access denied" });
  }

  // 2. Rate limiting
  const endpoint = req.path.split("/")[2] || "default"; // e.g., /api/contact -> contact
  const rateLimit = checkRateLimit(ip, endpoint);

  res.setHeader("X-RateLimit-Remaining", rateLimit.remaining.toString());

  if (!rateLimit.allowed) {
    console.warn(`[SECURITY] Rate limit exceeded: ${ip} on ${endpoint}`);
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  // 3. Scan request body for malicious content (only for POST/PUT/PATCH)
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
    const issues = scanObject(req.body);
    if (issues.length > 0) {
      console.warn(`[SECURITY] Malicious content detected from ${ip}:`, issues);
      return res.status(400).json({ error: "Invalid request content" });
    }
  }

  // 4. Scan query parameters
  if (Object.keys(req.query).length > 0) {
    const issues = scanObject(req.query);
    if (issues.length > 0) {
      console.warn(`[SECURITY] Malicious query params from ${ip}:`, issues);
      return res.status(400).json({ error: "Invalid request parameters" });
    }
  }

  // 5. Check for suspicious headers
  const userAgent = req.headers["user-agent"] || "";
  if (!userAgent || userAgent.length < 10) {
    // Log but don't block - could be legitimate API clients
    console.info(`[SECURITY] Suspicious user-agent from ${ip}: ${userAgent}`);
  }

  // 6. Add security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  next();
}

// ===========================================
// ADMIN AUTH MIDDLEWARE
// ===========================================
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice(7);

  // TODO: Verify JWT token using @omega/security auth module
  // For now, just check token exists
  if (!token) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // TODO: Check if user is admin from token claims
  // const claims = verifyJWT(token);
  // if (!claims.isAdmin) {
  //   return res.status(403).json({ error: "Admin access required" });
  // }

  next();
}

// ===========================================
// WEBHOOK SIGNATURE VERIFICATION
// ===========================================
export function verifyWebhookSignature(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers["verif-hash"] as string;

    if (!signature) {
      console.warn("[SECURITY] Webhook missing signature");
      return res.status(401).json({ error: "Missing signature" });
    }

    const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    // Timing-safe comparison
    try {
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);

      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        console.warn("[SECURITY] Webhook signature mismatch");
        return res.status(401).json({ error: "Invalid signature" });
      }
    } catch {
      console.warn("[SECURITY] Webhook signature verification failed");
      return res.status(401).json({ error: "Invalid signature" });
    }

    next();
  };
}

// ===========================================
// HONEYPOT MIDDLEWARE (for forms)
// ===========================================
export function honeypotCheck(fieldName = "website") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body && req.body[fieldName]) {
      // Bot detected - silently accept but don't process
      console.info(`[SECURITY] Honeypot triggered from ${getClientIP(req)}`);
      return res.json({ success: true });
    }
    next();
  };
}

// ===========================================
// IDEMPOTENCY MIDDLEWARE
// ===========================================
const idempotencyStore = new Map<string, { response: unknown; timestamp: number }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function idempotencyCheck(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers["idempotency-key"] as string;

  if (!idempotencyKey) {
    return next();
  }

  const cached = idempotencyStore.get(idempotencyKey);

  if (cached && Date.now() - cached.timestamp < IDEMPOTENCY_TTL) {
    console.info(`[SECURITY] Idempotent request replayed: ${idempotencyKey}`);
    return res.json(cached.response);
  }

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override to cache response
  res.json = (body: unknown) => {
    idempotencyStore.set(idempotencyKey, { response: body, timestamp: Date.now() });
    return originalJson(body);
  };

  next();
}
