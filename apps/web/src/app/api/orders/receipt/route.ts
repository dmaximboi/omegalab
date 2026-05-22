import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id || typeof id !== "string" || id.length > 100) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Only return receipt for verified (paid) orders
    const order = await prisma.order.findFirst({
      where: {
        id,
        paymentVerified: true,
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, price: true } },
          },
        },
        user: {
          select: { name: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found or not paid" }, { status: 404 });
    }

    return NextResponse.json({
      orderNumber: order.txRef,
      receiptHash: order.receiptHash,
      customerName: order.user?.name || "Customer",
      items: order.items.map((item) => ({
        name: item.product?.name || "Product",
        quantity: item.quantity,
        price: Number(item.unitPrice),
      })),
      total: Number(order.totalAmount),
      date: order.createdAt.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    });
  } catch (error) {
    console.error("[RECEIPT] Error:", error);
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}
