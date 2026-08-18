import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { parseLogResponseData } from "@/lib/payment-log";

export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const status = searchParams.get("status") || undefined;

    const validStatuses = ["INITIATED", "PROCESSING", "VERIFYING", "PAID", "FAILED", "CANCELLED"] as const;
    const where = status && validStatuses.includes(status as any)
      ? { status: status as (typeof validStatuses)[number] }
      : {};

    const [orders, total] = await Promise.all([
      getPrisma().order.findMany({
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
      getPrisma().order.count({ where }),
    ]);

    const orderIds = orders.map((o: typeof orders[number]) => o.id);
    const logs = await getPrisma().paymentLog.findMany({
      where: { orderId: { in: orderIds } },
      orderBy: { createdAt: "asc" },
    });

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
      providerRef: order.providerRef,
      orderCurrency: order.orderCurrency || "NGN",
      paymentCurrency: order.paymentCurrency || null,
      paymentAmount: order.paymentAmount ? parseFloat(order.paymentAmount.toString()) : null,
      fxRate: order.fxRate ? parseFloat(order.fxRate.toString()) : null,
      fxSource: order.fxSource || null,
      ipAddress: order.ipAddress,
      userAgent: order.userAgent,
      customer: {
        name: order.customerName || order.user.name,
        email: order.customerEmail || order.user.email,
      },
      customerSnapshot: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        address: order.customerAddress,
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
        details: parseLogResponseData(log.responseData),
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
