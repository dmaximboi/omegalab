import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const status = searchParams.get("status") || undefined;

    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: { product: { select: { name: true } } },
          },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Get transaction logs for each order
    const orderIds = orders.map((o) => o.id);
    const logs = await prisma.paymentLog.findMany({
      where: { orderId: { in: orderIds } },
      orderBy: { createdAt: "asc" },
    });

    // Group logs by orderId
    const logsByOrder = new Map<string, typeof logs>();
    for (const log of logs) {
      if (!log.orderId) continue;
      const existing = logsByOrder.get(log.orderId) || [];
      existing.push(log);
      logsByOrder.set(log.orderId, existing);
    }

    const enrichedOrders = orders.map((order: typeof orders[number]) => ({
      id: order.id,
      txRef: order.txRef,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount.toString()),
      paymentVerified: order.paymentVerified,
      flwRef: order.flwRef,
      ipAddress: order.ipAddress,
      userAgent: order.userAgent,
      customer: {
        name: order.user.name,
        email: order.user.email,
      },
      items: order.items.map((item: typeof order.items[number]) => ({
        product: item.product.name,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
      })),
      transactionSteps: (logsByOrder.get(order.id) || []).map((log: typeof logs[number]) => ({
        step: log.status,
        timestamp: log.createdAt,
        ip: log.ipAddress,
        amount: log.amount ? parseFloat(log.amount.toString()) : null,
        details: log.responseData ? JSON.parse(log.responseData) : null,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      verifiedAt: order.verifiedAt,
    }));

    return NextResponse.json({
      orders: enrichedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN ORDERS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
