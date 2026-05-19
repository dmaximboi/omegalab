import { Router, Request, Response } from "express";

const router = Router();

// GET /api/products - List all products
router.get("/", async (_req: Request, res: Response) => {
  try {
    // TODO: Fetch from database
    const products = [
      { id: "1", name: "Digital Microscope", price: 450000, active: true },
      { id: "2", name: "Centrifuge Machine", price: 380000, active: true },
    ];
    res.json({ products });
  } catch {
    res.status(500).json({ error: "Could not fetch products" });
  }
});

// GET /api/products/:id - Get single product
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: Fetch from database
    const product = { id, name: "Digital Microscope", price: 450000, active: true };
    res.json({ product });
  } catch {
    res.status(500).json({ error: "Could not fetch product" });
  }
});

export default router;
