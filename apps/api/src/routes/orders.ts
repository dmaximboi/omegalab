import { Router, Request, Response } from "express";
import { z } from "zod";

const router = Router();

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1).max(100),
  })).min(1),
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().optional(),
});

// POST /api/orders - Create order
router.post("/", async (req: Request, res: Response) => {
  try {
    const result = createOrderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid order data" });
    }

    // TODO: Create order in database
    const order = {
      id: `ORD-${Date.now()}`,
      ...result.data,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({ order });
  } catch {
    res.status(500).json({ error: "Could not create order" });
  }
});

// GET /api/orders/:id - Get order by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: Fetch from database
    const order = {
      id,
      status: "PENDING",
      items: [],
      createdAt: new Date().toISOString(),
    };
    res.json({ order });
  } catch {
    res.status(500).json({ error: "Could not fetch order" });
  }
});

export default router;
