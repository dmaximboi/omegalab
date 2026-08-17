import { Router, Request, Response } from "express";
import crypto from "crypto";

const router = Router();

function verifyBachsSignature(rawBody: string, timestampHeader: string, signatureHeader: string, secret: string): boolean {
  const timestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

router.post("/bachs", async (req: Request, res: Response) => {
  try {
    const secret = process.env.BACHS_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[WEBHOOK] BACHS_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const timestamp = String(req.headers["x-bachs-timestamp"] || "");
    const signature = String(req.headers["x-bachs-signature"] || "");

    if (!verifyBachsSignature(rawBody, timestamp, signature, secret)) {
      console.error("[WEBHOOK] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const data = JSON.parse(rawBody);
    console.log("[WEBHOOK] Bachs event:", data.type, data.id);
    res.json({ status: "ok" });
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
