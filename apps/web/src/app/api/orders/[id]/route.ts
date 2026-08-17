import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { timingSafeEqualString } from "@/lib/payment";
import { syncOrderCheckoutState } from "@/lib/order-checkout-sync";

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
    const cookieStore = cookies();
    const paymentToken = cookieStore.get("payment_token")?.value;

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

    const hasValidPaymentToken =
      Boolean(paymentToken) &&
      Boolean(order.paymentToken) &&
      timingSafeEqualString(paymentToken!, order.paymentToken!) &&
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

    await syncOrderCheckoutState(getPrisma(), order);
    const syncedOrder = await getPrisma().order.findUnique({
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
    if (!syncedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const customer = {
      name: syncedOrder.customerName || syncedOrder.user?.name || "Customer",
      email: syncedOrder.customerEmail || syncedOrder.user?.email || "",
      phone: syncedOrder.customerPhone || "",
    };

    return NextResponse.json({
      id: syncedOrder.id,
      totalAmount: Number(syncedOrder.totalAmount),
      orderCurrency: syncedOrder.orderCurrency || "NGN",
      paymentCurrency: syncedOrder.paymentCurrency || null,
      paymentAmount: syncedOrder.paymentAmount ? Number(syncedOrder.paymentAmount.toString()) : null,
      status: syncedOrder.status,
      txRef: syncedOrder.txRef,
      userEmail: customer.email,
      userName: customer.name,
      userPhone: customer.phone,
      createdAt: syncedOrder.createdAt.toISOString(),
      resumeUrl: syncedOrder.paymentVerified ? null : `/payment/${syncedOrder.id}`,
      items: syncedOrder.items.map((item: (typeof syncedOrder.items)[number]) => ({
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
