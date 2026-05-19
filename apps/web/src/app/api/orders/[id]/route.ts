import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow user to see their own orders (unless admin)
    if (order.userId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.txRef,
        status: order.status,
        total: Number(order.totalAmount),
        createdAt: order.createdAt.toISOString(),
        shippingAddress: "",
        items: order.items.map((item: { id: string; product: { name: string } | null; quantity: number; unitPrice: unknown }) => ({
          id: item.id,
          name: item.product?.name || "Product",
          quantity: item.quantity,
          price: Number(item.unitPrice),
        })),
      },
    });
  } catch (error) {
    console.error("[ORDER] Fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}
