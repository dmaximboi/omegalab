import { Router, Request, Response } from "express";
import { z } from "zod";

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(2000),
  website: z.string().max(0).optional(), // Honeypot
});

// POST /api/contact - Submit contact form
router.post("/", async (req: Request, res: Response) => {
  try {
    const result = contactSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid form data" });
    }

    // Check honeypot
    if (result.data.website) {
      // Bot detected, silently accept
      return res.json({ success: true });
    }

    // TODO: Save to database and send notification
    console.log("[CONTACT]", result.data.email, result.data.subject);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Could not send message" });
  }
});

export default router;
