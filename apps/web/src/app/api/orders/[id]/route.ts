import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Lazy Prisma client - only instantiated when first accessed
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const paymentToken = request.headers.get("x-payment-token");

    const order = await getPrisma().order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { email: true, name: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: {
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Allow access if valid paymentToken is provided (for checkout flow)
    const hasValidPaymentToken = paymentToken && 
      order.paymentToken === paymentToken && 
      order.tokenExpiresAt && 
      new Date() < new Date(order.tokenExpiresAt);

    // Otherwise require session-based ownership or admin
    if (!hasValidPaymentToken) {
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (order.userId !== session.user.id && !session.user.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Only expose fields needed by the frontend — never leak paymentToken or receiptSalt
    return NextResponse.json({
      id: order.id,
      totalAmount: Number(order.totalAmount),
      status: order.status,
      txRef: order.txRef,
      userEmail: (order as any).user?.email,
      userName: (order as any).user?.name,
      userPhone: (order as any).phone,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        product: item.product,
      })),
    });
  } catch (error) {
    console.error("[ORDER] Fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}
