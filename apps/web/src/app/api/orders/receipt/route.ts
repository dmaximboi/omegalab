import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { timingSafeEqualString } from "@/lib/payment";

export const dynamic = "force-dynamic";

// Lazy Prisma client - only instantiated when first accessed
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const paymentToken = cookies().get("payment_token")?.value;

    if (!session?.user?.id && !paymentToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");

    if (!id || typeof id !== "string" || id.length > 100) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const order = await getPrisma().order.findFirst({
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

    const tokenOk =
      Boolean(paymentToken) &&
      Boolean(order.paymentToken) &&
      timingSafeEqualString(paymentToken!, order.paymentToken!);
    const ownerOk = Boolean(session?.user?.id && session.user.id === order.userId);
    const adminOk = session?.user?.isAdmin === true;

    if (!tokenOk && !ownerOk && !adminOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      orderNumber: order.txRef,
      receiptHash: order.receiptHash,
      customerName: order.customerName || order.user?.name || "Customer",
      customerEmail: order.customerEmail || undefined,
      items: order.items.map((item: typeof order.items[number]) => ({
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
