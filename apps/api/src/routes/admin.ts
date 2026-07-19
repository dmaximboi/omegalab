import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";

const router = Router();

/**
 * Admin routes for the Express API scaffold.
 * These are NOT used by the production Next.js app (apps/web).
 * Locked down so a deployed stub cannot be abused with a fake Bearer token.
 */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const expected = process.env.ADMIN_API_TOKEN;

  if (!expected || expected.length < 32) {
    return res.status(503).json({ error: "Admin API not configured" });
  }

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  const expectedBuf = Buffer.from(expected);
  const tokenBuf = Buffer.from(token);

  if (
    expectedBuf.length !== tokenBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, tokenBuf)
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

router.use(requireAdmin);

router.get("/stats", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — use the Next.js admin API" });
});

router.get("/orders", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — use the Next.js admin API" });
});

router.put("/orders/:id/status", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — use the Next.js admin API" });
});

router.get("/products", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — use the Next.js admin API" });
});

router.post("/products", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — use the Next.js admin API" });
});

router.put("/products/:id", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — use the Next.js admin API" });
});

router.delete("/products/:id", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — use the Next.js admin API" });
});

router.get("/messages", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — use the Next.js admin API" });
});

router.put("/messages/:id/read", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — use the Next.js admin API" });
});

export default router;
