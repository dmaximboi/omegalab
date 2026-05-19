import { Router, Request, Response, NextFunction } from "express";

const router = Router();

// Admin authentication middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // TODO: Verify JWT token and check admin role
  const token = authHeader.slice(7);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

// Apply admin middleware to all routes
router.use(requireAdmin);

// GET /api/admin/stats - Dashboard stats
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    // TODO: Fetch from database
    const stats = {
      totalOrders: 150,
      pendingOrders: 12,
      totalRevenue: 45000000,
      totalProducts: 48,
      totalUsers: 320,
      unreadMessages: 5,
    };
    res.json({ stats });
  } catch {
    res.status(500).json({ error: "Could not fetch stats" });
  }
});

// GET /api/admin/orders - List all orders
router.get("/orders", async (_req: Request, res: Response) => {
  try {
    // TODO: Fetch from database
    const orders: unknown[] = [];
    res.json({ orders });
  } catch {
    res.status(500).json({ error: "Could not fetch orders" });
  }
});

// PUT /api/admin/orders/:id/status - Update order status
router.put("/orders/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // TODO: Update in database and create audit log
    console.log("[ADMIN] Order status updated:", id, status);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Could not update order" });
  }
});

// GET /api/admin/products - List all products
router.get("/products", async (_req: Request, res: Response) => {
  try {
    // TODO: Fetch from database
    const products: unknown[] = [];
    res.json({ products });
  } catch {
    res.status(500).json({ error: "Could not fetch products" });
  }
});

// POST /api/admin/products - Create product
router.post("/products", async (req: Request, res: Response) => {
  try {
    const { name, description, price, images } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    // TODO: Create in database and create audit log
    const product = {
      id: `PROD-${Date.now()}`,
      name,
      description,
      price,
      images,
      active: true,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({ product });
  } catch {
    res.status(500).json({ error: "Could not create product" });
  }
});

// PUT /api/admin/products/:id - Update product
router.put("/products/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // TODO: Update in database and create audit log
    console.log("[ADMIN] Product updated:", id, updates);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Could not update product" });
  }
});

// DELETE /api/admin/products/:id - Soft delete product
router.delete("/products/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // TODO: Soft delete in database and create audit log
    console.log("[ADMIN] Product soft deleted:", id);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Could not delete product" });
  }
});

// GET /api/admin/messages - List messages
router.get("/messages", async (_req: Request, res: Response) => {
  try {
    // TODO: Fetch from database
    const messages: unknown[] = [];
    res.json({ messages });
  } catch {
    res.status(500).json({ error: "Could not fetch messages" });
  }
});

// PUT /api/admin/messages/:id/read - Mark message as read
router.put("/messages/:id/read", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // TODO: Update in database
    console.log("[ADMIN] Message marked as read:", id);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Could not update message" });
  }
});

export default router;
