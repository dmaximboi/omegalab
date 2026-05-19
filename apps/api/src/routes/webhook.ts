import { Router, Request, Response } from "express";
import crypto from "crypto";

const router = Router();

// POST /api/webhook/flutterwave - Flutterwave payment webhook
router.post("/flutterwave", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["verif-hash"] as string;
    const secret = process.env.FLW_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[WEBHOOK] FLW_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Verify signature using timing-safe comparison
    const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    try {
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""))) {
        console.error("[WEBHOOK] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    } catch {
      console.error("[WEBHOOK] Signature verification failed");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (data.event === "charge.completed" && data.data?.status === "successful") {
      const txRef = data.data.tx_ref;
      const amount = data.data.amount;

      // TODO: Verify with Flutterwave API (don't trust webhook alone)
      // TODO: Update order status in database
      console.log("[WEBHOOK] Payment successful:", txRef, amount);
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
