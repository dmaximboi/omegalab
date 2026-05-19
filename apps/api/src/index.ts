import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import { errorHandler } from "./middleware/error";
import { securityMiddleware } from "./middleware/security";

import productsRouter from "./routes/products";
import ordersRouter from "./routes/orders";
import contactRouter from "./routes/contact";
import webhookRouter from "./routes/webhook";
import adminRouter from "./routes/admin";

const app = express();
const PORT = process.env.PORT || 4000;

// ===========================================
// SECURITY MIDDLEWARE (from @omega/security)
// ===========================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:3000"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS - Strict origin
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  maxAge: 86400, // 24 hours
}));

// Compression
app.use(compression());

// Request logging (not in production for sensitive data)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Custom security middleware (rate limiting, request validation, etc.)
app.use(securityMiddleware);

// Body parsing (except for webhooks which need raw body)
app.use("/api/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ===========================================
// ROUTES
// ===========================================

// Health check (no auth required)
app.get("/health", (_: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/contact", contactRouter);
app.use("/api/webhook", webhookRouter);
app.use("/api/admin", adminRouter);

// Error handler (sanitizes errors before sending to client)
app.use(errorHandler);

// 404 handler
app.use((_: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});

export default app;
