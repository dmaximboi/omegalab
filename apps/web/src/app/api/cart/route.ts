import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  }
  return globalForPrisma.prisma;
}

// GET: Fetch user's cart
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ items: [] }, { status: 401 });
    }

    const cartItems = await getPrisma().cartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            isActive: true,
            images: { take: 1, orderBy: { order: "asc" }, select: { url: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const items = cartItems
      .filter((ci) => ci.product.isActive)
      .map((ci) => ({
        id: ci.product.id,
        name: ci.product.name,
        price: parseFloat(ci.product.price.toString()),
        image: ci.product.images[0]?.url || "",
        quantity: ci.quantity,
      }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[CART] Fetch error:", error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}

// POST: Sync entire cart (replace server cart with client cart)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid cart data" }, { status: 400 });
    }

    const userId = session.user.id;

    // Delete existing cart items
    await getPrisma().cartItem.deleteMany({ where: { userId } });

    // Insert new cart items (only valid ones)
    if (items.length > 0) {
      const validItems = items
        .filter((item: any) => item.id && item.quantity > 0 && item.quantity <= 100)
        .slice(0, 50);

      if (validItems.length > 0) {
        await getPrisma().cartItem.createMany({
          data: validItems.map((item: any) => ({
            userId,
            productId: String(item.id),
            quantity: Math.min(100, Math.max(1, Math.floor(item.quantity))),
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CART] Sync error:", error);
    return NextResponse.json({ error: "Failed to sync cart" }, { status: 500 });
  }
}

// PUT: Add/update a single item
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productId, quantity } = body;

    if (!productId || !quantity || quantity < 1 || quantity > 100) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    await getPrisma().cartItem.upsert({
      where: {
        userId_productId: { userId: session.user.id, productId },
      },
      create: {
        userId: session.user.id,
        productId,
        quantity: Math.floor(quantity),
      },
      update: {
        quantity: Math.floor(quantity),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CART] Update error:", error);
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
  }
}

// DELETE: Remove item or clear cart
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (productId) {
      await getPrisma().cartItem.deleteMany({
        where: { userId: session.user.id, productId },
      });
    } else {
      // Clear entire cart
      await getPrisma().cartItem.deleteMany({
        where: { userId: session.user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CART] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete cart item" }, { status: 500 });
  }
}
